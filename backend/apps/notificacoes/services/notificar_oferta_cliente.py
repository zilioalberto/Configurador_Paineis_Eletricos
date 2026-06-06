"""Notificações internas quando o cliente responde à oferta pública."""
from __future__ import annotations

from django.conf import settings

from apps.notificacoes.models import NotificacaoInterna, TipoNotificacaoInternaChoices
from apps.orcamentos.models import (
    DecisaoOfertaClienteChoices,
    Orcamento,
    OrcamentoOfertaConvite,
    OrcamentoOfertaEnvio,
    OrcamentoOfertaRespostaCliente,
)


def _link_orcamento(orcamento: Orcamento) -> str:
    base = (getattr(settings, "OFERTA_PUBLICA_FRONTEND_URL", "") or "").rstrip("/")
    # Link interno do ERP (mesma origem do portal autenticado)
    portal = base.replace("/oferta-publica", "") if "/oferta-publica" in base else base
    if not portal:
        portal = "http://localhost:5173"
    return f"{portal}/orcamentos/{orcamento.id}"


def _destinatarios_orcamento(
    orcamento: Orcamento,
    convite: OrcamentoOfertaConvite,
) -> list:
    from django.contrib.auth import get_user_model

    user_model = get_user_model()
    ids: set = set()
    users = []

    def add(user) -> None:
        if not user or not getattr(user, "is_active", True):
            return
        pk = user.pk
        if pk in ids:
            return
        ids.add(pk)
        users.append(user)

    envio = (
        OrcamentoOfertaEnvio.objects.filter(convite=convite)
        .select_related("enviado_por")
        .order_by("-enviado_em")
        .first()
    )
    if envio:
        add(envio.enviado_por)
    add(orcamento.criado_por)
    add(orcamento.atualizado_por)
    if convite.criado_por_id:
        try:
            add(user_model.objects.get(pk=convite.criado_por_id))
        except user_model.DoesNotExist:
            pass
    return users


def notificar_resposta_oferta_cliente(
    convite: OrcamentoOfertaConvite,
    resposta: OrcamentoOfertaRespostaCliente,
) -> list[NotificacaoInterna]:
    """Cria alertas para a equipe comercial ligada à proposta."""
    orcamento = convite.orcamento
    aprovado = resposta.decisao == DecisaoOfertaClienteChoices.APROVADO
    tipo = (
        TipoNotificacaoInternaChoices.OFERTA_APROVADA_CLIENTE
        if aprovado
        else TipoNotificacaoInternaChoices.OFERTA_REJEITADA_CLIENTE
    )
    cliente = orcamento.cliente.razao_social if orcamento.cliente_id else orcamento.cliente_referencia
    responsavel = resposta.nome_responsavel or "Cliente"
    if aprovado:
        titulo = f"Oferta aprovada — {orcamento.codigo}"
        mensagem = (
            f"{responsavel} aprovou a proposta de {cliente or 'cliente'}. "
            f"A proposta passou para o status Aprovado."
        )
    else:
        titulo = f"Oferta recusada — {orcamento.codigo}"
        obs = f" Motivo: {resposta.observacao}" if resposta.observacao else ""
        mensagem = f"{responsavel} recusou a proposta de {cliente or 'cliente'}.{obs}"

    link = _link_orcamento(orcamento)
    criadas: list[NotificacaoInterna] = []
    for user in _destinatarios_orcamento(orcamento, convite):
        criadas.append(
            NotificacaoInterna.objects.create(
                destinatario=user,
                tipo=tipo,
                titulo=titulo,
                mensagem=mensagem,
                link=link,
                referencia_app="orcamentos",
                referencia_id=orcamento.id,
            )
        )
    return criadas
