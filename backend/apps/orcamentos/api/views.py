"""
API REST de orçamentos e margens por cliente (`/orcamentos/`).
"""
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from core.permissions import PermissionKeys
from apps.configurador_paineis.projetos.models import ProjetoConfigurador
from apps.orcamentos.api.action_serializers import (
    AdicionarPainelConfiguradorSerializer,
    EnviarOfertaClienteSerializer,
    GerarBlocosPadraoOfertaSerializer,
    MarcarOfertaEnviadaSerializer,
    NovaRevisaoOrcamentoSerializer,
    RevisarPrecoCatalogoItemSerializer,
    UploadArquivoOfertaSerializer,
    VincularProjetoConfiguradorSerializer,
)
from apps.orcamentos.api.serializers import (
    ConfiguracaoMargemClienteSerializer,
    OrcamentoConfiguradorPainelSerializer,
    OrcamentoOfertaArquivoSerializer,
    OrcamentoSerializer,
)
from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    Orcamento,
    OrcamentoConfiguradorPainel,
    OrcamentoOfertaArquivo,
    OrcamentoOfertaEnvio,
    StatusOrcamentoChoices,
    TipoArquivoOfertaChoices,
)
from apps.orcamentos.services.blocos_padrao_oferta import gerar_blocos_padrao_oferta
from apps.orcamentos.services.configurador_painel import (
    OrcamentoOperacaoError,
    adicionar_painel_configurador,
    iniciar_projeto_configurador,
    sincronizar_composicao_painel,
    vincular_projeto_configurador,
)
from apps.orcamentos.services.docx_oferta import (
    gerar_docx_oferta_bytes,
    nome_arquivo_docx_oferta,
)
from apps.orcamentos.services.atualizar_oferta import atualizar_oferta_rascunho
from apps.orcamentos.services.enviar_oferta_cliente import EnviarOfertaError, enviar_oferta_ao_cliente
from apps.orcamentos.services.pdf_oferta import gerar_pdf_oferta_bytes, nome_arquivo_pdf_oferta
from apps.orcamentos.services.preview_oferta import montar_preview_oferta
from django.db.models import Max
from django.http import FileResponse, HttpResponse
from apps.orcamentos.services.reabrir_oferta import reabrir_oferta_finalizada
from apps.orcamentos.services.revisar_preco_catalogo import revisar_preco_catalogo_item_orcamento
from apps.orcamentos.services.revisao_orcamento import criar_revisao_orcamento
from rest_framework.parsers import FormParser, MultiPartParser


def _orcamento_queryset():
    return (
        Orcamento.objects.select_related(
            "cliente",
            "contato_cliente",
            "criado_por",
            "atualizado_por",
            "orcamento_origem",
            "snapshot_envio",
        )
        .prefetch_related(
            "cliente__enderecos",
            "itens__produto",
            "itens__servico",
            "itens__configurador_painel",
            "oferta_blocos",
            "oferta_arquivos__criado_por",
            "oferta_envios__pdf_final",
            "oferta_envios__convite",
            "oferta_envios__enviado_por",
            "configuradores_painel__projeto_configurador",
            "revisoes_derivadas__snapshot_envio",
        )
        .all()
    )


class OrcamentoListCreateView(generics.ListCreateAPIView):
    """Lista propostas e cria orçamento (margens do cliente aplicadas no serializer)."""

    queryset = _orcamento_queryset()
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_CRIAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class OrcamentoDetailView(generics.RetrieveUpdateAPIView):
    """Detalhe e atualização com sync completo de itens quando `itens` é enviado."""

    queryset = _orcamento_queryset()
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "pk"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class OrcamentoNovaRevisaoView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_CRIAR

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = NovaRevisaoOrcamentoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            novo = criar_revisao_orcamento(
                orcamento,
                tipo_revisao=ser.validated_data["tipo_revisao"],
                paineis_reconfigurar=ser.validated_data.get("paineis_reconfigurar"),
                titulo=ser.validated_data.get("titulo") or None,
                descricao=ser.validated_data.get("descricao"),
                usuario=request.user if request.user.is_authenticated else None,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoSerializer(novo, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class OrcamentoAtualizarOfertaView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        try:
            itens = atualizar_oferta_rascunho(orcamento)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        orcamento.refresh_from_db()
        return Response(
            {
                "itens_atualizados": len(itens),
                "orcamento": OrcamentoSerializer(
                    orcamento,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class OrcamentoReabrirOfertaView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        try:
            reaberto = reabrir_oferta_finalizada(orcamento)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoSerializer(reaberto, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoPreviewOfertaView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_VISUALIZAR

    def get(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        return Response(montar_preview_oferta(orcamento), status=status.HTTP_200_OK)


class OrcamentoGerarPdfOfertaView(APIView):
    """Gera um PDF simples da oferta a partir do preview (ReportLab)."""
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_VISUALIZAR

    def get(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        preview = montar_preview_oferta(orcamento)
        pdf = gerar_pdf_oferta_bytes(preview)
        nome = nome_arquivo_pdf_oferta(preview)
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{nome}"'
        response.write(pdf)
        return response


class OrcamentoGerarDocxOfertaView(APIView):
    """Gera um DOCX editável da oferta para revisão comercial."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_VISUALIZAR

    def get(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        body = gerar_docx_oferta_bytes(orcamento)
        filename = nome_arquivo_docx_oferta(orcamento)
        response = HttpResponse(
            body,
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class OrcamentoOfertaArquivoListCreateView(APIView):
    permission_classes = [HasEffectivePermission]
    parser_classes = [MultiPartParser, FormParser]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR

    def get(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        arquivos = orcamento.oferta_arquivos.select_related("criado_por")
        return Response(OrcamentoOfertaArquivoSerializer(arquivos, many=True).data)

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = UploadArquivoOfertaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        arquivo = ser.validated_data["arquivo"]
        tipo = ser.validated_data["tipo"]
        ultima_versao = (
            OrcamentoOfertaArquivo.objects.filter(orcamento=orcamento, tipo=tipo)
            .aggregate(valor=Max("versao"))
            .get("valor")
            or 0
        )
        OrcamentoOfertaArquivo.objects.create(
            orcamento=orcamento,
            tipo=tipo,
            arquivo=arquivo,
            nome_original=arquivo.name or "",
            content_type=getattr(arquivo, "content_type", "") or "",
            tamanho_bytes=getattr(arquivo, "size", 0) or 0,
            versao=ultima_versao + 1,
            criado_por=request.user if request.user.is_authenticated else None,
        )
        orcamento.refresh_from_db()
        return Response(
            OrcamentoSerializer(orcamento, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OrcamentoOfertaArquivoDownloadView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_VISUALIZAR

    def get(self, request, pk, arquivo_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        arquivo = get_object_or_404(
            OrcamentoOfertaArquivo,
            pk=arquivo_id,
            orcamento=orcamento,
        )
        response = FileResponse(
            arquivo.arquivo.open("rb"),
            as_attachment=True,
            filename=arquivo.nome_original,
            content_type=arquivo.content_type or "application/octet-stream",
        )
        return response


class OrcamentoEnviarOfertaClienteView(APIView):
    """Finaliza envio: PDF automático, convite público, registro e e-mail opcional."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = EnviarOfertaClienteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            orcamento, envio, link = enviar_oferta_ao_cliente(
                orcamento,
                destinatario_nome=ser.validated_data.get("destinatario_nome", ""),
                destinatario_email=ser.validated_data.get("destinatario_email", ""),
                destinatario_emails=ser.validated_data.get("destinatario_emails", []),
                assunto=ser.validated_data.get("assunto", ""),
                mensagem=ser.validated_data.get("mensagem", ""),
                enviar_email=ser.validated_data.get("enviar_email", False),
                usuario=request.user,
            )
        except EnviarOfertaError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        orcamento = get_object_or_404(_orcamento_queryset(), pk=orcamento.pk)
        data = OrcamentoSerializer(orcamento, context={"request": request}).data
        data["link_publico"] = link
        data["email_enviado"] = envio.email_enviado
        data["email_erro"] = envio.email_erro
        data["destinatario_emails"] = envio.destinatario_emails
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoMarcarOfertaEnviadaView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = MarcarOfertaEnviadaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        pdf_id = ser.validated_data.get("pdf_final_id")
        pdf_qs = OrcamentoOfertaArquivo.objects.filter(
            orcamento=orcamento,
            tipo=TipoArquivoOfertaChoices.PDF_FINAL,
        )
        if pdf_id:
            pdf_final = get_object_or_404(pdf_qs, pk=pdf_id)
        else:
            pdf_final = pdf_qs.order_by("-criado_em").first()
        if not pdf_final:
            return Response(
                {"detail": "Anexe o PDF final antes de marcar a oferta como enviada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        OrcamentoOfertaEnvio.objects.create(
            orcamento=orcamento,
            pdf_final=pdf_final,
            destinatario_nome=ser.validated_data.get("destinatario_nome", ""),
            destinatario_email=ser.validated_data.get("destinatario_email", ""),
            assunto=ser.validated_data.get("assunto", ""),
            mensagem=ser.validated_data.get("mensagem", ""),
            enviado_por=request.user if request.user.is_authenticated else None,
        )
        orcamento.status = StatusOrcamentoChoices.ENVIADO
        orcamento.save(update_fields=("status", "codigo", "codigo_base", "revisao", "atualizado_em"))
        orcamento.refresh_from_db()
        return Response(
            OrcamentoSerializer(orcamento, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class OrcamentoGerarBlocosPadraoOfertaView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = GerarBlocosPadraoOfertaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            gerar_blocos_padrao_oferta(
                orcamento,
                perfil=ser.validated_data.get("perfil_oferta"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        orcamento.refresh_from_db()
        data = OrcamentoSerializer(orcamento, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoRevisarPrecoCatalogoItemView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.CATALOGO_REVISAR_PRECO

    def post(self, request, pk, item_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = RevisarPrecoCatalogoItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            revisar_preco_catalogo_item_orcamento(
                orcamento,
                item_id,
                preco_base=ser.validated_data["preco_base"],
                justificativa=ser.validated_data["justificativa"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        orcamento.refresh_from_db()
        data = OrcamentoSerializer(orcamento, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoConfiguradorPainelListCreateView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR

    def get(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        paineis = orcamento.configuradores_painel.order_by("ordem", "id")
        data = OrcamentoConfiguradorPainelSerializer(paineis, many=True).data
        return Response(data)

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = AdicionarPainelConfiguradorSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            vinculo = adicionar_painel_configurador(
                orcamento,
                descricao_painel=ser.validated_data["descricao_painel"],
                usuario=request.user if request.user.is_authenticated else None,
            )
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoConfiguradorPainelSerializer(vinculo).data
        return Response(data, status=status.HTTP_201_CREATED)


class OrcamentoIniciarConfiguradorView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk, vinculo_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        vinculo = get_object_or_404(
            OrcamentoConfiguradorPainel,
            pk=vinculo_id,
            orcamento=orcamento,
        )
        try:
            vinculo = iniciar_projeto_configurador(
                orcamento,
                vinculo,
                usuario=request.user if request.user.is_authenticated else None,
            )
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoConfiguradorPainelSerializer(vinculo).data
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoVincularProjetoConfiguradorView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk, vinculo_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        vinculo = get_object_or_404(
            OrcamentoConfiguradorPainel,
            pk=vinculo_id,
            orcamento=orcamento,
        )
        ser = VincularProjetoConfiguradorSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        projeto = get_object_or_404(
            ProjetoConfigurador,
            pk=ser.validated_data["projeto_configurador_id"],
        )
        try:
            vinculo = vincular_projeto_configurador(
                orcamento,
                vinculo,
                projeto,
                usuario=request.user if request.user.is_authenticated else None,
            )
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoConfiguradorPainelSerializer(vinculo).data
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoSincronizarComposicaoView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk, vinculo_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        vinculo = get_object_or_404(
            OrcamentoConfiguradorPainel,
            pk=vinculo_id,
            orcamento=orcamento,
        )
        try:
            itens = sincronizar_composicao_painel(orcamento, vinculo)
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        orcamento.refresh_from_db()
        return Response(
            {
                "itens_sincronizados": len(itens),
                "orcamento": OrcamentoSerializer(
                    orcamento, context={"request": request}
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class ConfiguracaoMargemClienteListCreateView(generics.ListCreateAPIView):
    """CRUD de margens padrão por parceiro cliente."""

    queryset = ConfiguracaoMargemCliente.objects.select_related("cliente").all()
    serializer_class = ConfiguracaoMargemClienteSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class ConfiguracaoMargemClienteDetailView(generics.RetrieveUpdateAPIView):
    """Consulta e edita margens de um cliente específico."""

    queryset = ConfiguracaoMargemCliente.objects.select_related("cliente").all()
    serializer_class = ConfiguracaoMargemClienteSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "pk"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR
