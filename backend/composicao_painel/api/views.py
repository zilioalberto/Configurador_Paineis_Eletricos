from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Max
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.api.permissions import HasEffectivePermission
from catalogo.models import Produto
from composicao_painel.api.serializers import (
    AprovarSugestaoInputSerializer,
    ComposicaoInclusaoManualSerializer,
    ComposicaoItemSerializer,
    InclusaoManualCreateSerializer,
    PendenciaItemSerializer,
    ProdutoAlternativaSerializer,
    SugestaoItemSerializer,
)
from composicao_painel.models import (
    ComposicaoInclusaoManual,
    ComposicaoItem,
    PendenciaItem,
    SugestaoItem,
)
from composicao_painel.services.alternativas_produto import listar_alternativas_para_sugestao
from composicao_painel.services.sugestoes.aprovacao_sugestoes import aprovar_sugestao_item
from composicao_painel.services.sugestoes.aprovacao_sugestoes import (
    reabrir_composicao_item_para_sugestao,
)
from composicao_painel.services.sugestoes.orquestrador import gerar_sugestoes_painel
from composicao_painel.services.export_lista_completa import (
    montar_linhas_export,
    nome_arquivo_seguro,
    render_pdf_bytes,
    render_xlsx_bytes,
)
from composicao_painel.services.sugestoes.orquestrador_pendencias import (
    reavaliar_pendencias_projeto,
)
from core.choices import StatusPendenciaChoices
from core.permissions import PermissionKeys
from projetos.models import Projeto
from projetos.services.fluxo_projeto import validar_projeto_editavel
from projetos.services.rastreabilidade import registrar_evento_projeto


def _composicao_select_related():
    return (
        "produto",
        "carga",
        "carga__motor",
        "carga__resistencia",
        "carga__valvula",
        "projeto",
    )


def _nome_usuario_auditoria(user) -> str:
    full_name = ""
    if user is not None and hasattr(user, "get_full_name"):
        full_name = (user.get_full_name() or "").strip()
    if full_name:
        return full_name
    if user is not None and getattr(user, "email", None):
        return str(user.email)
    if user is not None and getattr(user, "username", None):
        return str(user.username)
    return "utilizador"


def _snapshot(projeto: Projeto) -> dict:
    sugestoes = (
        SugestaoItem.objects.filter(projeto=projeto)
        .select_related(*_composicao_select_related())
        .order_by("ordem", "id")
    )
    pendencias = (
        PendenciaItem.objects.filter(projeto=projeto)
        .select_related(
            "projeto",
            "carga",
            "carga__motor",
            "carga__resistencia",
            "carga__valvula",
        )
        .order_by("ordem", "id")
    )
    composicao_itens = (
        ComposicaoItem.objects.filter(projeto=projeto)
        .select_related(*_composicao_select_related())
        .order_by("ordem", "id")
    )
    inclusoes = (
        ComposicaoInclusaoManual.objects.filter(projeto=projeto)
        .select_related("produto")
        .order_by("ordem", "id")
    )
    sug_data = SugestaoItemSerializer(sugestoes, many=True).data
    pen_data = PendenciaItemSerializer(pendencias, many=True).data
    comp_data = ComposicaoItemSerializer(composicao_itens, many=True).data
    inc_data = ComposicaoInclusaoManualSerializer(inclusoes, many=True).data
    return {
        "projeto": str(projeto.id),
        "projeto_codigo": projeto.codigo,
        "projeto_nome": projeto.nome,
        "sugestoes": sug_data,
        "pendencias": pen_data,
        "composicao_itens": comp_data,
        "inclusoes_manuais": inc_data,
        "totais": {
            "sugestoes": len(sug_data),
            "pendencias": len(pen_data),
            "composicao_itens": len(comp_data),
            "inclusoes_manuais": len(inc_data),
        },
    }


class ComposicaoProjetoSnapshotView(APIView):
    """GET: lista sugestões, pendências e itens aprovados da composição do projeto."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_VISUALIZAR_TAREFAS

    def get(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        return Response(_snapshot(projeto))


class ComposicaoGerarSugestoesView(APIView):
    """
    POST: executa o orquestrador de sugestões (seccionamento, contatoras,
    disjuntores motor quando aplicável). Body opcional: {"limpar_antes": true}.
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL

    def post(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        try:
            validar_projeto_editavel(projeto)
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)
        limpar = request.data.get("limpar_antes", True)
        if not isinstance(limpar, bool):
            limpar = str(limpar).lower() in ("1", "true", "yes")

        resultado = gerar_sugestoes_painel(projeto, limpar_antes=limpar)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="gerada",
            descricao="Sugestões de composição geradas.",
            detalhes={"total_sugestoes": resultado.get("total_sugestoes", 0)},
        )
        snap = _snapshot(projeto)
        snap["geracao"] = {
            "total_sugestoes_retornadas": resultado.get("total_sugestoes", 0),
            "erros_etapas": resultado.get("erros", []),
            "sugestoes_descartadas_aprovadas": resultado.get(
                "sugestoes_descartadas_aprovadas", 0
            ),
        }
        return Response(snap, status=status.HTTP_200_OK)


class ComposicaoReavaliarPendenciasView(APIView):
    """
    POST: reexecuta as regras de composição por categoria para pendências abertas
    (equivalente à action do admin «Reavaliar pendências do projeto»).
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL

    def post(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        try:
            validar_projeto_editavel(projeto)
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        total_antes = PendenciaItem.objects.filter(
            projeto=projeto,
            status=StatusPendenciaChoices.ABERTA,
        ).count()

        resultado = reavaliar_pendencias_projeto(projeto)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="reavaliada",
            descricao="Pendências de composição reavaliadas.",
            detalhes={
                "categorias_reavaliadas": len(resultado.get("categorias_reavaliadas", [])),
                "categorias_nao_mapeadas": len(resultado.get("categorias_nao_mapeadas", [])),
            },
        )

        total_depois = PendenciaItem.objects.filter(
            projeto=projeto,
            status=StatusPendenciaChoices.ABERTA,
        ).count()

        snap = _snapshot(projeto)
        rid = resultado.get("projeto_id")
        snap["reavaliacao"] = {
            **resultado,
            "projeto_id": str(rid) if rid is not None else str(projeto.id),
            "pendencias_abertas_antes": total_antes,
            "pendencias_abertas_depois": total_depois,
        }
        return Response(snap, status=status.HTTP_200_OK)


class SugestaoAlternativasView(APIView):
    """GET: lista alternativas de catálogo compatíveis com a sugestão (≥ corrente, mesma bobina/montagem quando aplicável)."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_VISUALIZAR_TAREFAS

    def get(self, request, sugestao_id):
        sugestao = get_object_or_404(
            SugestaoItem.objects.select_related(
                "projeto",
                "produto",
                "carga",
                "carga__motor",
                "carga__resistencia",
                "carga__valvula",
            ),
            pk=sugestao_id,
        )
        qs = listar_alternativas_para_sugestao(sugestao)
        data = ProdutoAlternativaSerializer(qs, many=True).data
        return Response({"alternativas": data})


class SugestaoAprovarView(APIView):
    """POST: aprova a sugestão e transfere para ComposicaoItem. Body opcional: {"produto_id": "<uuid>"} para substituto da mesma categoria."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL

    def post(self, request, sugestao_id):
        sugestao = get_object_or_404(
            SugestaoItem.objects.select_related("projeto", "produto"),
            pk=sugestao_id,
        )
        try:
            validar_projeto_editavel(sugestao.projeto)
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        input_ser = AprovarSugestaoInputSerializer(data=request.data)
        input_ser.is_valid(raise_exception=True)
        pid = input_ser.validated_data.get("produto_id")

        substituto = None
        if pid is not None:
            substituto = get_object_or_404(Produto, pk=pid)

        try:
            item = aprovar_sugestao_item(
                sugestao,
                produto_substituto=substituto,
                usuario_nome=_nome_usuario_auditoria(request.user),
            )
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        projeto = item.projeto
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="aprovada",
            descricao="Sugestão aprovada na composição.",
            detalhes={
                "sugestao_id": str(sugestao.id),
                "composicao_item_id": str(item.id),
                "produto_id": str(item.produto_id),
            },
        )
        return Response(
            {
                "composicao_item": ComposicaoItemSerializer(item).data,
                "snapshot": _snapshot(projeto),
            },
            status=status.HTTP_200_OK,
        )


class ComposicaoInclusaoManualCreateView(APIView):
    """POST: adiciona produto do catálogo às inclusões manuais do projeto."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL

    def post(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        try:
            validar_projeto_editavel(projeto)
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        input_ser = InclusaoManualCreateSerializer(data=request.data)
        input_ser.is_valid(raise_exception=True)
        pid = input_ser.validated_data["produto_id"]
        produto = get_object_or_404(Produto, pk=pid)
        if not produto.ativo:
            return Response(
                {"detail": ["Produto inativo no catálogo."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_ordem = ComposicaoInclusaoManual.objects.filter(projeto=projeto).aggregate(
            m=Max("ordem")
        )["m"]
        next_ordem = (max_ordem or 0) + 1

        inc = ComposicaoInclusaoManual.objects.create(
            projeto=projeto,
            produto=produto,
            quantidade=input_ser.validated_data.get("quantidade", 1),
            observacoes=input_ser.validated_data.get("observacoes", ""),
            ordem=next_ordem,
        )
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="inclusao_manual_criada",
            descricao="Inclusão manual adicionada na composição.",
            detalhes={
                "inclusao_id": str(inc.id),
                "produto_id": str(produto.id),
                "quantidade": str(inc.quantidade),
            },
        )

        return Response(
            {
                "inclusao_manual": ComposicaoInclusaoManualSerializer(inc).data,
                "snapshot": _snapshot(projeto),
            },
            status=status.HTTP_201_CREATED,
        )


class ComposicaoInclusaoManualDestroyView(APIView):
    """DELETE: remove uma inclusão manual."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL

    def delete(self, request, inclusao_id):
        inc = get_object_or_404(
            ComposicaoInclusaoManual.objects.select_related("projeto"),
            pk=inclusao_id,
        )
        try:
            validar_projeto_editavel(inc.projeto)
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        projeto = inc.projeto
        detalhes = {
            "inclusao_id": str(inc.id),
            "produto_id": str(inc.produto_id),
            "quantidade": str(inc.quantidade),
        }
        inc.delete()
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="inclusao_manual_removida",
            descricao="Inclusão manual removida da composição.",
            detalhes=detalhes,
        )
        return Response({"snapshot": _snapshot(projeto)}, status=status.HTTP_200_OK)


class ComposicaoItemReabrirView(APIView):
    """POST: remove item aprovado e devolve para sugestões pendentes."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL

    def post(self, request, composicao_item_id):
        item = get_object_or_404(
            ComposicaoItem.objects.select_related("projeto", "produto"),
            pk=composicao_item_id,
        )
        try:
            validar_projeto_editavel(item.projeto)
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sugestao = reabrir_composicao_item_para_sugestao(
                item, usuario_nome=_nome_usuario_auditoria(request.user)
            )
        except DjangoValidationError as exc:
            detail = exc.messages if hasattr(exc, "messages") else [str(exc)]
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        projeto = sugestao.projeto
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="reaberta",
            descricao="Item aprovado reaberto para sugestões de revisão.",
            detalhes={
                "sugestao_id": str(sugestao.id),
                "categoria_produto": sugestao.categoria_produto,
                "carga_id": str(sugestao.carga_id) if sugestao.carga_id else None,
            },
        )
        return Response(
            {
                "sugestao_item": SugestaoItemSerializer(sugestao).data,
                "snapshot": _snapshot(projeto),
            },
            status=status.HTTP_200_OK,
        )


class ComposicaoExportXlsxView(APIView):
    """GET: planilha Excel com composição aprovada, inclusões manuais e pendências."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_VISUALIZAR_TAREFAS

    def get(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        header, linhas = montar_linhas_export(projeto, incluir_memoria_calculo=True)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="exportada_xlsx",
            descricao="Lista de composição exportada em XLSX.",
            detalhes={"linhas": len(linhas)},
        )
        body = render_xlsx_bytes(projeto, header, linhas)
        fn = nome_arquivo_seguro(projeto, "xlsx")
        resp = HttpResponse(
            body,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )
        resp["Content-Disposition"] = f'attachment; filename="{fn}"'
        return resp


class ComposicaoExportPdfView(APIView):
    """GET: PDF com composição aprovada, inclusões manuais e pendências."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.ALMOXARIFADO_VISUALIZAR_TAREFAS

    def get(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        header, linhas = montar_linhas_export(projeto, incluir_memoria_calculo=False)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="composicao",
            acao="exportada_pdf",
            descricao="Lista de composição exportada em PDF.",
            detalhes={"linhas": len(linhas)},
        )
        body = render_pdf_bytes(projeto, header, linhas)
        fn = nome_arquivo_seguro(projeto, "pdf")
        resp = HttpResponse(body, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{fn}"'
        return resp
