"""Testes de notificações internas — resposta do cliente à oferta."""
from __future__ import annotations

import secrets
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.cadastros.models import ParceiroComercial
from apps.notificacoes.models import NotificacaoInterna, TipoNotificacaoInternaChoices
from apps.notificacoes.services.notificar_oferta_cliente import notificar_resposta_oferta_cliente
from apps.orcamentos.models import (
    DecisaoOfertaClienteChoices,
    Orcamento,
    OrcamentoItem,
    OrcamentoOfertaRespostaCliente,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.convite_oferta import criar_convite_oferta
from apps.orcamentos.services.snapshot_orcamento import criar_snapshot_envio_orcamento

User = get_user_model()


@pytest.fixture
def user_comercial():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_user(
        email="notif-comercial@test.com",
        password=raw,
        is_active=True,
    )
    return user


@pytest.fixture
def cliente():
    return ParceiroComercial.objects.create(
        documento="11222333000188",
        razao_social="Cliente Notif LTDA",
        eh_cliente=True,
    )


@pytest.mark.django_db
def test_notificar_resposta_oferta_cria_alerta(user_comercial, cliente):
    orc = Orcamento.objects.create(
        titulo="Painel",
        cliente=cliente,
        status=StatusOrcamentoChoices.FINALIZADO,
        valido_ate=timezone.localdate(),
        criado_por=user_comercial,
        atualizado_por=user_comercial,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Item",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("10"),
        margem_percentual=Decimal("10"),
        preco_unitario=Decimal("11"),
    )
    snap = criar_snapshot_envio_orcamento(orc, usuario=user_comercial)
    convite = criar_convite_oferta(orc, snap, usuario=user_comercial)
    resposta = OrcamentoOfertaRespostaCliente.objects.get(convite=convite)
    resposta.decisao = DecisaoOfertaClienteChoices.APROVADO
    resposta.nome_responsavel = "Maria"
    resposta.save()

    criadas = notificar_resposta_oferta_cliente(convite, resposta)
    assert len(criadas) >= 1
    notif = NotificacaoInterna.objects.filter(destinatario=user_comercial).first()
    assert notif is not None
    assert notif.tipo == TipoNotificacaoInternaChoices.OFERTA_APROVADA_CLIENTE
    assert str(orc.id) in notif.link
