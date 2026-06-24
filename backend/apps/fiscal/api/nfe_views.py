"""Views REST de NF-es recebidas e controle NSU."""
from decimal import Decimal

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import mixins, viewsets
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.nfe_serializers import (
    ControleNSUSerializer,
    DocumentoFiscalEmitidoDetailSerializer,
    DocumentoFiscalEmitidoSerializer,
    DocumentoFiscalRecebidoDetailSerializer,
    DocumentoFiscalRecebidoSerializer,
    DocumentoSefazDistribuidoDetailSerializer,
    DocumentoSefazDistribuidoSerializer,
    ImportarCatalogoNFeSerializer,
    ImportarXMLDocumentoEmitidoSerializer,
    ImportarXMLNFeSerializer,
    ReclassificarEntradaSerializer,
    RelatorioNFeSerializer,
    VincularProdutoItemSerializer,
)
from apps.fiscal.models import (
    ControleNSU,
    DocumentoFiscalEmitido,
    DocumentoFiscalRecebido,
    DocumentoSefazDistribuido,
    ItemDocumentoFiscal,
)
from apps.catalogo.models import Produto
from apps.fiscal.services.documento_emitido_parser import DocumentoEmitidoParserError
from apps.fiscal.services.importar_xml_documento_emitido_service import (
    importar_xml_documento_emitido,
)
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.services.nfe_parser import NFeParserError
from apps.fiscal.services.reclassificar_entrada import reclassificar_entrada
from apps.fiscal.services.sefaz.nsu_sync import redefinir_nsu_sefaz
from apps.fiscal.services.ponte_catalogo import (
    importar_nfe_para_catalogo,
    preview_catalogo_nfe,
    vincular_item_a_produto,
)
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys

MSG_NFE_RECEBIDA_NAO_ENCONTRADA = "NF-e recebida não encontrada."


def _resposta_importar_xml(resultado: dict) -> Response:
    documento = resultado["documento"]
    status_code = status.HTTP_201_CREATED if resultado["created"] else status.HTTP_200_OK
    return Response(
        {
            "created": resultado["created"],
            "message": resultado["message"],
            "documento_id": documento.id,
            "chave_acesso": documento.chave_acesso,
        },
        status=status_code,
    )


class DocumentoFiscalPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class DocumentoFiscalRecebidoViewSet(ReadOnlyModelViewSet):
    """Lista e detalha NF-es recebidas (autenticação JWT padrão do projeto)."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    queryset = DocumentoFiscalRecebido.objects.prefetch_related("itens").order_by(
        "-data_emissao",
        "-criada_em",
    )
    pagination_class = DocumentoFiscalPagination

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentoFiscalRecebidoDetailSerializer
        return DocumentoFiscalRecebidoSerializer

    FILTROS_EXATOS = (
        "chave_acesso",
        "numero",
        "serie",
        "status_importacao",
        "origem_importacao",
        "objetivo_entrada",
        "manifestacao_status",
    )
    FILTROS_CNPJ = ("cnpj_emitente", "cnpj_destinatario")

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        for campo in self.FILTROS_EXATOS:
            valor = (params.get(campo) or "").strip()
            if valor:
                qs = qs.filter(**{campo: valor})

        for campo in self.FILTROS_CNPJ:
            valor = (params.get(campo) or "").strip()
            if valor:
                qs = qs.filter(**{campo: normalizar_cnpj(valor)})

        return qs


class DocumentoSefazDistribuidoViewSet(ReadOnlyModelViewSet):
    """Caixa de entrada da Distribuição DFe (resumos, XML completo e eventos)."""

    permission_classes = [HasEffectivePermission]
    queryset = DocumentoSefazDistribuido.objects.select_related("documento_recebido")
    pagination_class = DocumentoFiscalPagination

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentoSefazDistribuidoDetailSerializer
        return DocumentoSefazDistribuidoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        chave = (params.get("chave_acesso") or "").strip()
        if chave:
            qs = qs.filter(chave_acesso=chave)

        status_doc = (params.get("status") or "").strip()
        if status_doc:
            qs = qs.filter(status=status_doc)

        manifestacao = (params.get("manifestacao_status") or "").strip()
        if manifestacao:
            qs = qs.filter(manifestacao_status=manifestacao)

        cnpj_emit = (params.get("cnpj_emitente") or "").strip()
        if cnpj_emit:
            qs = qs.filter(cnpj_emitente=normalizar_cnpj(cnpj_emit))

        return qs.order_by("-data_emissao", "-criado_em")


_EMITIDAS_ORDERING_MAP: dict[str, tuple[str, ...]] = {
    "serie": ("serie", "numero", "-data_emissao"),
    "-serie": ("-serie", "-numero", "-data_emissao"),
    "data_emissao": ("data_emissao", "-criada_em"),
    "-data_emissao": ("-data_emissao", "-criada_em"),
    "nome_destinatario": ("nome_destinatario", "-data_emissao"),
    "-nome_destinatario": ("-nome_destinatario", "-data_emissao"),
}
_EMITIDAS_ORDERING_DEFAULT = ("-data_emissao", "-criada_em")


def aplicar_ordenacao_emitidas(queryset, ordering_param: str):
    """Aplica ordenação segura à listagem de documentos emitidos."""
    chave = (ordering_param or "").strip()
    campos = _EMITIDAS_ORDERING_MAP.get(chave)
    if campos:
        return queryset.order_by(*campos)
    return queryset.order_by(*_EMITIDAS_ORDERING_DEFAULT)


def _parametro_texto(params, nome: str) -> str:
    return (params.get(nome) or "").strip()


def _filtrar_incluir_faturamento(queryset, valor: str):
    incluir = valor.lower()
    if incluir in {"true", "1", "sim"}:
        return queryset.filter(incluir_faturamento=True)
    if incluir in {"false", "0", "nao", "não"}:
        return queryset.filter(incluir_faturamento=False)
    return queryset


def filtrar_queryset_emitidas(queryset, params):
    """Aplica filtros de query string à listagem de documentos emitidos."""
    filtros_simples = (
        ("tipo_documento", "tipo_documento"),
        ("objetivo_saida", "objetivo_saida"),
        ("cfop", "cfop_predominante"),
        ("anexo_simples", "anexo_simples"),
    )
    for param, campo in filtros_simples:
        valor = _parametro_texto(params, param)
        if valor:
            queryset = queryset.filter(**{campo: valor})

    data_inicio = _parametro_texto(params, "data_inicio")
    if data_inicio:
        queryset = queryset.filter(data_emissao__date__gte=data_inicio)

    data_fim = _parametro_texto(params, "data_fim")
    if data_fim:
        queryset = queryset.filter(data_emissao__date__lte=data_fim)

    cnpj_dest = _parametro_texto(params, "cnpj_destinatario")
    if cnpj_dest:
        queryset = queryset.filter(cnpj_destinatario=normalizar_cnpj(cnpj_dest))

    cliente = _parametro_texto(params, "cliente")
    if cliente:
        queryset = queryset.filter(nome_destinatario__icontains=cliente)

    queryset = _filtrar_incluir_faturamento(
        queryset,
        _parametro_texto(params, "incluir_faturamento"),
    )
    return aplicar_ordenacao_emitidas(queryset, _parametro_texto(params, "ordering"))


class DocumentoFiscalEmitidoViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Lista, detalha e exclui NF-es/NFS-es emitidas importadas pela ZFW."""

    permission_classes = [HasEffectivePermission]
    lookup_field = "public_id"
    lookup_value_regex = "[0-9a-f-]{36}"

    def required_permission(self, request, view):
        if self.action == "destroy":
            return PermissionKeys.FISCAL_EDITAR
        return PermissionKeys.FISCAL_VISUALIZAR

    queryset = DocumentoFiscalEmitido.objects.prefetch_related("itens")
    pagination_class = DocumentoFiscalPagination

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentoFiscalEmitidoDetailSerializer
        return DocumentoFiscalEmitidoSerializer

    def get_queryset(self):
        return filtrar_queryset_emitidas(super().get_queryset(), self.request.query_params)


class RelatorioNFeView(APIView):
    """Relatório gerencial/contábil de NF-es por período e finalidade."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def _queryset_entradas(self, params):
        qs = DocumentoFiscalRecebido.objects.prefetch_related("itens").order_by(
            "-data_emissao",
            "-criada_em",
        )

        data_inicio = (params.get("data_inicio") or "").strip()
        if data_inicio:
            qs = qs.filter(data_emissao__date__gte=data_inicio)

        data_fim = (params.get("data_fim") or "").strip()
        if data_fim:
            qs = qs.filter(data_emissao__date__lte=data_fim)

        objetivo = (params.get("objetivo_entrada") or "").strip()
        if objetivo:
            qs = qs.filter(objetivo_entrada=objetivo)

        cnpj_emit = (params.get("cnpj_emitente") or "").strip()
        if cnpj_emit:
            qs = qs.filter(cnpj_emitente=normalizar_cnpj(cnpj_emit))

        fornecedor = (params.get("fornecedor") or "").strip()
        if fornecedor:
            qs = qs.filter(nome_emitente__icontains=fornecedor)

        return qs

    def _queryset_saidas(self, params):
        qs = DocumentoFiscalEmitido.objects.prefetch_related("itens").order_by(
            "-data_emissao",
            "-criada_em",
        )

        data_inicio = (params.get("data_inicio") or "").strip()
        if data_inicio:
            qs = qs.filter(data_emissao__date__gte=data_inicio)

        data_fim = (params.get("data_fim") or "").strip()
        if data_fim:
            qs = qs.filter(data_emissao__date__lte=data_fim)

        objetivo = (params.get("objetivo_saida") or params.get("objetivo_entrada") or "").strip()
        if objetivo:
            qs = qs.filter(objetivo_saida=objetivo)

        cnpj_dest = (params.get("cnpj_destinatario") or params.get("cnpj_emitente") or "").strip()
        if cnpj_dest:
            qs = qs.filter(cnpj_destinatario=normalizar_cnpj(cnpj_dest))

        cliente = (params.get("cliente") or params.get("fornecedor") or "").strip()
        if cliente:
            qs = qs.filter(nome_destinatario__icontains=cliente)

        return qs

    def _linha_entrada(self, doc):
        return {
            **DocumentoFiscalRecebidoSerializer(doc).data,
            "tipo_movimento": "ENTRADA",
            "tipo_documento": "NFE_PRODUTO",
            "participante_nome": doc.nome_emitente,
            "participante_cnpj": doc.cnpj_emitente,
            "objetivo": doc.objetivo_entrada,
        }

    def _linha_saida(self, doc):
        return {
            **DocumentoFiscalEmitidoSerializer(doc).data,
            "tipo_movimento": "SAIDA",
            "participante_nome": doc.nome_destinatario,
            "participante_cnpj": doc.cnpj_destinatario,
            "objetivo": doc.objetivo_saida,
        }

    def _validar_tipo_movimento(self, request) -> str:
        tipo_movimento = (request.query_params.get("tipo_movimento") or "ENTRADA").strip().upper()
        if tipo_movimento not in {"ENTRADA", "SAIDA", "TODOS"}:
            raise ValidationError({"tipo_movimento": "Tipo de movimento inválido."})
        return tipo_movimento

    def _querysets_relatorio(self, tipo_movimento: str, params) -> tuple:
        entradas = self._queryset_entradas(params) if tipo_movimento in {"ENTRADA", "TODOS"} else []
        saidas = self._queryset_saidas(params) if tipo_movimento in {"SAIDA", "TODOS"} else []
        return entradas, saidas

    def _registrar_documento_relatorio(
        self,
        *,
        doc,
        tipo_movimento: str,
        objetivo: str,
        linha: dict,
        documentos: list[dict],
        por_objetivo_map: dict[tuple[str, str], dict],
    ) -> Decimal:
        valor = doc.valor_total or Decimal("0.00")
        documentos.append(linha)
        row = por_objetivo_map.setdefault(
            (tipo_movimento, objetivo),
            {
                "tipo_movimento": tipo_movimento,
                "objetivo": objetivo,
                "total_documentos": 0,
                "valor_total": Decimal("0.00"),
            },
        )
        row["total_documentos"] += 1
        row["valor_total"] += valor
        return valor

    def _montar_documentos_relatorio(self, entradas, saidas) -> tuple[list[dict], Decimal, dict]:
        documentos: list[dict] = []
        valor_total = Decimal("0.00")
        por_objetivo_map: dict[tuple[str, str], dict] = {}

        for doc in list(entradas)[:1000]:
            valor_total += self._registrar_documento_relatorio(
                doc=doc,
                tipo_movimento="ENTRADA",
                objetivo=doc.objetivo_entrada,
                linha=self._linha_entrada(doc),
                documentos=documentos,
                por_objetivo_map=por_objetivo_map,
            )

        limite_saidas = max(0, 1000 - len(documentos))
        for doc in list(saidas)[:limite_saidas]:
            valor_total += self._registrar_documento_relatorio(
                doc=doc,
                tipo_movimento="SAIDA",
                objetivo=doc.objetivo_saida,
                linha=self._linha_saida(doc),
                documentos=documentos,
                por_objetivo_map=por_objetivo_map,
            )
        documentos.sort(key=lambda row: row.get("data_emissao") or "", reverse=True)
        return documentos, valor_total, por_objetivo_map

    def _filtros_relatorio(self, request, tipo_movimento: str) -> dict:
        return {
            "tipo_movimento": tipo_movimento,
            "data_inicio": (request.query_params.get("data_inicio") or "").strip(),
            "data_fim": (request.query_params.get("data_fim") or "").strip(),
            "objetivo_entrada": (request.query_params.get("objetivo_entrada") or "").strip(),
            "objetivo_saida": (request.query_params.get("objetivo_saida") or "").strip(),
            "cnpj_emitente": (request.query_params.get("cnpj_emitente") or "").strip(),
            "cnpj_destinatario": (request.query_params.get("cnpj_destinatario") or "").strip(),
            "fornecedor": (request.query_params.get("fornecedor") or "").strip(),
            "cliente": (request.query_params.get("cliente") or "").strip(),
        }

    def get(self, request):
        tipo_movimento = self._validar_tipo_movimento(request)
        entradas, saidas = self._querysets_relatorio(tipo_movimento, request.query_params)
        documentos, valor_total, por_objetivo_map = self._montar_documentos_relatorio(
            entradas,
            saidas,
        )
        payload = {
            "filtros": self._filtros_relatorio(request, tipo_movimento),
            "resumo": {
                "tipo_movimento": tipo_movimento,
                "total_documentos": len(documentos),
                "valor_total": valor_total,
                "por_objetivo": sorted(
                    por_objetivo_map.values(),
                    key=lambda row: (row["tipo_movimento"], row["objetivo"]),
                ),
            },
            "documentos": documentos,
        }
        return Response(RelatorioNFeSerializer(payload).data)


class ImportarXMLDocumentoEmitidoPortalView(APIView):
    """Importa XML de NF-e/NFS-e emitida pela ZFW pelo portal."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        serializer = ImportarXMLDocumentoEmitidoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            resultado = importar_xml_documento_emitido(
                xml=data["xml"],
                tipo_documento=data.get("tipo_documento"),
                objetivo_saida=data.get("objetivo_saida"),
                origem_importacao="MANUAL",
                classificar_automaticamente=data.get("classificar_automaticamente", True),
            )
        except DocumentoEmitidoParserError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        documento = resultado["documento"]
        status_code = status.HTTP_201_CREATED if resultado["created"] else status.HTTP_200_OK
        return Response(
            {
                "created": resultado["created"],
                "message": resultado["message"],
                "documento_id": documento.id,
                "documento_public_id": str(documento.public_id),
                "identificador": documento.identificador,
            },
            status=status_code,
        )


class ImportarXMLNFePortalView(APIView):
    """Importa XML de NF-e pelo portal (JWT); origem fixa MANUAL."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        serializer = ImportarXMLNFeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            resultado = importar_xml_nfe(
                xml=data["xml"],
                nsu=data.get("nsu") or None,
                cnpj_destinatario=data.get("cnpj_destinatario") or None,
                origem_importacao="MANUAL",
                objetivo_entrada=data.get("objetivo_entrada"),
            )
        except NFeParserError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return _resposta_importar_xml(resultado)


class ReclassificarEntradaView(APIView):
    """Reclassifica manualmente a destinação (objetivo) de uma NF-e recebida."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def patch(self, request, documento_id: int):
        try:
            documento = DocumentoFiscalRecebido.objects.prefetch_related("itens").get(
                pk=documento_id
            )
        except DocumentoFiscalRecebido.DoesNotExist:
            return Response(
                {"detail": MSG_NFE_RECEBIDA_NAO_ENCONTRADA},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ReclassificarEntradaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        itens_objetivo = {
            item["item_id"]: item["objetivo_entrada"] for item in data.get("itens", [])
        }
        documento = reclassificar_entrada(
            documento,
            objetivo_nota=data.get("objetivo_entrada"),
            itens_objetivo=itens_objetivo or None,
        )
        return Response(DocumentoFiscalRecebidoDetailSerializer(documento).data)


class PreviewCatalogoNFeView(APIView):
    """Preview de importação da NF-e recebida para o catálogo (com matching em cascata)."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_EDITAR_LISTA

    def get(self, request, documento_id: int):
        try:
            documento = DocumentoFiscalRecebido.objects.prefetch_related("itens").get(
                pk=documento_id
            )
        except DocumentoFiscalRecebido.DoesNotExist:
            return Response(
                {"detail": MSG_NFE_RECEBIDA_NAO_ENCONTRADA},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            return Response(preview_catalogo_nfe(documento))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class ImportarCatalogoNFeView(APIView):
    """Importa os produtos da NF-e recebida para o catálogo (rastreabilidade + de-para)."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_EDITAR_LISTA

    def post(self, request, documento_id: int):
        try:
            documento = DocumentoFiscalRecebido.objects.prefetch_related("itens").get(
                pk=documento_id
            )
        except DocumentoFiscalRecebido.DoesNotExist:
            return Response(
                {"detail": MSG_NFE_RECEBIDA_NAO_ENCONTRADA},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ImportarCatalogoNFeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data
        try:
            resultado, vinculados = importar_nfe_para_catalogo(
                documento,
                criar_fornecedor=dados.get("criar_fornecedor", False),
                fornecedor_id=dados.get("fornecedor_id"),
                categoria_padrao=dados.get("categoria_padrao") or "",
                itens=dados["itens"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "produtos_criados": resultado.produtos_criados,
                "produtos_atualizados": resultado.produtos_atualizados,
                "produtos_ignorados": resultado.produtos_ignorados,
                "fornecedores_associados": resultado.fornecedores_associados,
                "itens_vinculados": vinculados,
                "avisos": resultado.avisos,
            }
        )


class VincularProdutoItemView(APIView):
    """Confirma manualmente que um item de NF-e corresponde a um produto do catálogo."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_EDITAR_LISTA

    def post(self, request, item_id: int):
        try:
            item = ItemDocumentoFiscal.objects.select_related("documento").get(pk=item_id)
        except ItemDocumentoFiscal.DoesNotExist:
            return Response(
                {"detail": "Item de NF-e não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = VincularProdutoItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        produto = Produto.objects.filter(pk=dados["produto_id"]).first()
        if produto is None:
            return Response(
                {"detail": "Produto não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        vincular_item_a_produto(
            item,
            produto,
            registrar_depara=dados.get("registrar_depara", True),
        )
        return Response(
            {
                "item_id": item.id,
                "produto_id": str(produto.id),
                "produto_codigo": produto.codigo,
                "importado_para_produto": True,
            }
        )


class ControleNSUView(APIView):
    """Consulta o controle NSU da SEFAZ (usuário JWT com permissão de visualização)."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def _get_or_create(self, cnpj_raw: str) -> ControleNSU:
        cnpj = normalizar_cnpj(cnpj_raw)
        if len(cnpj) != 14:
            raise ValidationError({"cnpj": "CNPJ deve conter 14 dígitos."})
        controle, _ = ControleNSU.objects.get_or_create(
            cnpj=cnpj,
            defaults={"ultimo_nsu": "000000000000000"},
        )
        return controle

    def get(self, request, cnpj: str):
        controle = self._get_or_create(cnpj)
        return Response(ControleNSUSerializer(controle).data)


class ControleNSUEditarView(APIView):
    """Edita manualmente o NSU consumido da SEFAZ (usuário JWT com permissão de edição).

    Permite ajustar o NSU para ressincronizar NF-es. Também remove o bloqueio
    temporário (cStat 137/656).
    """

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def patch(self, request, cnpj: str):
        novo_nsu = str(request.data.get("ultimo_nsu", "")).strip()
        if not novo_nsu:
            return Response(
                {"detail": "Informe o NSU (ultimo_nsu)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            controle = redefinir_nsu_sefaz(cnpj, novo_nsu=novo_nsu)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ControleNSUSerializer(controle).data)
