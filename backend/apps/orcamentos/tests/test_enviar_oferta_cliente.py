"""Testes do fluxo de envio e resposta pública da oferta."""
from __future__ import annotations

import secrets
from decimal import Decimal

import pytest
from django.core import mail
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone

from apps.cadastros.models import ParceiroComercial
from apps.orcamentos.models import (
    DecisaoOfertaClienteChoices,
    Orcamento,
    OrcamentoItem,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.convite_oferta import montar_url_convite_publico, obter_convite_por_token
from apps.orcamentos.services.email_oferta import enviar_email_oferta
from apps.orcamentos.services.enviar_oferta_cliente import EnviarOfertaError, enviar_oferta_ao_cliente
from apps.orcamentos.services.html_oferta import gerar_html_oferta
from apps.orcamentos.services.pdf_oferta import _logo_path
from apps.orcamentos.services.responder_oferta_publica import registrar_resposta_oferta_publica
from apps.orcamentos.services.snapshot_orcamento import criar_snapshot_envio_orcamento

User = get_user_model()


@pytest.fixture
def user_admin():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_superuser(
        email="envio-oferta-admin@test.com",
        password=raw,
        is_active=True,
    )
    return user, raw


@pytest.fixture
def cliente():
    return ParceiroComercial.objects.create(
        documento="11222333000199",
        razao_social="Cliente Envio LTDA",
        eh_cliente=True,
    )


def _item(orc: Orcamento) -> None:
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Painel",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )


@pytest.mark.django_db
def test_enviar_oferta_exige_finalizado(user_admin, cliente):
    user, _raw = user_admin
    orc = Orcamento.objects.create(
        titulo="Painel teste",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
        criado_por=user,
        atualizado_por=user,
    )
    with pytest.raises(EnviarOfertaError):
        enviar_oferta_ao_cliente(orc, usuario=user)


@pytest.mark.django_db
def test_enviar_oferta_cria_convite_e_marca_enviado(user_admin, cliente):
    user, _raw = user_admin
    orc = Orcamento.objects.create(
        titulo="Painel teste",
        cliente=cliente,
        status=StatusOrcamentoChoices.FINALIZADO,
        valido_ate=timezone.localdate(),
        criado_por=user,
        atualizado_por=user,
    )
    _item(orc)
    criar_snapshot_envio_orcamento(orc, usuario=user)

    orc, envio, link = enviar_oferta_ao_cliente(
        orc,
        enviar_email=False,
        usuario=user,
    )
    assert orc.status == StatusOrcamentoChoices.ENVIADO
    assert envio.convite_id
    assert link.startswith("http")
    assert envio.pdf_final_id

    convite = obter_convite_por_token(envio.convite.token)
    assert convite.orcamento_id == orc.id


@pytest.mark.django_db
def test_enviar_oferta_registra_erro_quando_email_falha(monkeypatch, user_admin, cliente):
    user, _raw = user_admin
    orc = Orcamento.objects.create(
        titulo="Painel teste",
        cliente=cliente,
        status=StatusOrcamentoChoices.FINALIZADO,
        valido_ate=timezone.localdate(),
        criado_por=user,
        atualizado_por=user,
    )
    _item(orc)
    criar_snapshot_envio_orcamento(orc, usuario=user)

    monkeypatch.setattr(
        "apps.orcamentos.services.enviar_oferta_cliente.email_configurado",
        lambda: True,
    )

    def _falhar_envio(**_kwargs):
        raise RuntimeError("Falha SMTP de teste")

    monkeypatch.setattr(
        "apps.orcamentos.services.enviar_oferta_cliente.enviar_email_oferta",
        _falhar_envio,
    )

    orc, envio, link = enviar_oferta_ao_cliente(
        orc,
        destinatario_email="cliente@example.com",
        enviar_email=True,
        usuario=user,
    )

    assert orc.status == StatusOrcamentoChoices.ENVIADO
    assert link.startswith("http")
    assert envio.email_enviado is False
    assert envio.email_erro == "Falha SMTP de teste"


@pytest.mark.django_db
def test_enviar_oferta_envia_para_multiplos_emails(monkeypatch, user_admin, cliente):
    user, _raw = user_admin
    orc = Orcamento.objects.create(
        titulo="Painel teste",
        cliente=cliente,
        status=StatusOrcamentoChoices.FINALIZADO,
        valido_ate=timezone.localdate(),
        criado_por=user,
        atualizado_por=user,
    )
    _item(orc)
    criar_snapshot_envio_orcamento(orc, usuario=user)
    chamadas = []

    monkeypatch.setattr(
        "apps.orcamentos.services.enviar_oferta_cliente.email_configurado",
        lambda: True,
    )

    def _capturar_envio(**kwargs):
        chamadas.append(kwargs)

    monkeypatch.setattr(
        "apps.orcamentos.services.enviar_oferta_cliente.enviar_email_oferta",
        _capturar_envio,
    )

    _orc, envio, _link = enviar_oferta_ao_cliente(
        orc,
        destinatario_nome="Joana",
        destinatario_email="joana@cliente.com",
        destinatario_emails=["compras@cliente.com", "joana@cliente.com"],
        enviar_email=True,
        usuario=user,
    )

    assert envio.email_enviado is True
    assert envio.destinatario_email == "joana@cliente.com"
    assert envio.destinatario_emails == "joana@cliente.com, compras@cliente.com"
    assert chamadas[0]["destinatarios"] == ["joana@cliente.com", "compras@cliente.com"]
    assert chamadas[0]["assunto"] == f"Proposta comercial ZFW {orc.codigo}"
    assert "Prezado Joana" in chamadas[0]["corpo"]


@pytest.mark.django_db
def test_cliente_aprova_oferta_publica(user_admin, cliente):
    user, _raw = user_admin
    orc = Orcamento.objects.create(
        titulo="Painel teste",
        cliente=cliente,
        status=StatusOrcamentoChoices.FINALIZADO,
        valido_ate=timezone.localdate(),
        criado_por=user,
        atualizado_por=user,
    )
    _item(orc)
    criar_snapshot_envio_orcamento(orc, usuario=user)
    orc, envio, _link = enviar_oferta_ao_cliente(orc, usuario=user)

    registrar_resposta_oferta_publica(
        envio.convite.token,
        decisao=DecisaoOfertaClienteChoices.APROVADO,
        nome_responsavel="João Compras",
        email="joao@empresa.com",
        ip="127.0.0.1",
    )
    orc.refresh_from_db()
    assert orc.status == StatusOrcamentoChoices.APROVADO

    from apps.notificacoes.models import NotificacaoInterna

    assert NotificacaoInterna.objects.filter(
        destinatario=user,
        referencia_id=orc.id,
    ).exists()


def test_montar_url_convite():
    url = montar_url_convite_publico("abc123")
    assert "/oferta-publica/abc123" in url


def test_pdf_oferta_resolve_logo_empacotado_no_backend():
    path = _logo_path()
    assert path is not None
    assert path.exists()
    assert path.name == "zfw-logo-engenharia.png"


def test_html_oferta_usa_layout_da_pagina_e_logo_inline():
    html = gerar_html_oferta(
        {
            "codigo": "PROP-TESTE",
            "codigo_base": "PROP-TESTE",
            "revisao": "A",
            "titulo": "Painel teste",
            "perfil_oferta": "MATERIAIS",
            "emissao": "2026-06-05",
            "validade": "2026-06-30",
            "cliente": {
                "nome": "Cliente Teste LTDA",
                "contato": "Joana",
                "email": "joana@example.com",
                "telefone": "",
                "endereco": "Joinville - SC",
                "cnpj": "11.222.333/0001-99",
            },
            "secoes": [{"tipo": "INTRODUCAO", "titulo": "Introdução", "conteudo": "Prezados."}],
            "investimento": {
                "titulo": "Investimento",
                "itens": [
                    {
                        "id": "1",
                        "descricao": "Painel elétrico",
                        "ncm": "85371090",
                        "quantidade": "1",
                        "unidade": "un",
                        "preco_unitario": "120",
                        "subtotal": "120",
                        "codigo": "PNL-1",
                    }
                ],
            },
            "totais": {"desconto_ativo": False, "total": "120"},
            "apendice_legal": {"versao": "teste", "secoes": []},
        }
    )

    assert "proposta-cliente__cabecalho-inicio" in html
    assert "proposta-cliente__destinatario-card" in html
    assert "proposta-cliente__tabela-wrap" in html
    assert "data:image/png;base64," in html


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_HOST="smtp.example.test",
    DEFAULT_FROM_EMAIL="vendas@zfw.com.br",
    ZFW_EMAIL_LOGO_PATH="",
    ZFW_WHATSAPP_E164="5547984027016",
    ZFW_WHATSAPP_DISPLAY="+55 47 98402-7016",
)
def test_enviar_email_oferta_inclui_assinatura_html_whatsapp_e_pdf():
    enviar_email_oferta(
        destinatario="cliente@example.com",
        assunto="Proposta comercial",
        corpo="Prezado cliente\n\nSegue nossa proposta.",
        pdf_bytes=b"%PDF-1.4 teste",
        nome_arquivo_pdf="proposta.pdf",
    )

    assert len(mail.outbox) == 1
    msg = mail.outbox[0]
    assert msg.body.startswith("Prezado cliente")
    assert msg.alternatives
    html, content_type = msg.alternatives[0]
    assert content_type == "text/html"
    assert "ZFW Engenharia" in html
    assert "Proposta comercial" in html
    assert "https://wa.me/5547984027016" in html
    assert "data:image/svg+xml" in html
    assert "Falar pelo WhatsApp" in html
    assert any(isinstance(anexo, tuple) and anexo[0] == "proposta.pdf" for anexo in msg.attachments)
