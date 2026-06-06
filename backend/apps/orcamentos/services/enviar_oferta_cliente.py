"""Orquestra envio da oferta: snapshot, PDF, convite, registro e e-mail."""
from __future__ import annotations

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Max

from apps.orcamentos.models import (
    CanalEnvioOfertaChoices,
    Orcamento,
    OrcamentoOfertaArquivo,
    OrcamentoOfertaEnvio,
    StatusOrcamentoChoices,
    TipoArquivoOfertaChoices,
)
from apps.orcamentos.services.convite_oferta import (
    criar_convite_oferta,
    montar_url_convite_publico,
)
from apps.orcamentos.services.email_oferta import email_configurado, enviar_email_oferta
from apps.orcamentos.services.pdf_oferta import gerar_pdf_oferta_bytes, nome_arquivo_pdf_oferta
from apps.orcamentos.services.politica_preco_catalogo import validar_finalizacao_preco_catalogo
from apps.orcamentos.services.preview_oferta import montar_preview_oferta
from apps.orcamentos.services.snapshot_orcamento import criar_snapshot_envio_orcamento


class EnviarOfertaError(Exception):
    pass


def _garantir_pronto_para_envio(orcamento: Orcamento) -> None:
    if orcamento.status == StatusOrcamentoChoices.RASCUNHO:
        raise EnviarOfertaError(
            "Finalize a oferta antes de enviar ao cliente."
        )
    if orcamento.status not in (
        StatusOrcamentoChoices.FINALIZADO,
        StatusOrcamentoChoices.ENVIADO,
    ):
        raise EnviarOfertaError(
            f"Não é possível enviar oferta com status {orcamento.status}."
        )
    validar_finalizacao_preco_catalogo(orcamento)


def _proxima_versao_pdf(orcamento: Orcamento) -> int:
    atual = (
        OrcamentoOfertaArquivo.objects.filter(
            orcamento=orcamento,
            tipo=TipoArquivoOfertaChoices.PDF_FINAL,
        ).aggregate(m=Max("versao"))
        .get("m")
    )
    return (atual or 0) + 1


def _normalizar_destinatarios(destinatario_email: str, destinatario_emails: list[str] | None) -> list[str]:
    emails = [email.strip() for email in (destinatario_emails or []) if email.strip()]
    email_legado = destinatario_email.strip()
    if email_legado:
        emails.insert(0, email_legado)
    return list(dict.fromkeys(emails))


def _assunto_padrao(orcamento: Orcamento) -> str:
    return f"Proposta comercial ZFW {orcamento.codigo}"


def _mensagem_padrao(destinatario_nome: str) -> str:
    saudacao = f"Prezado {destinatario_nome.strip()}" if destinatario_nome.strip() else "Prezado cliente"
    return (
        f"{saudacao}\n\n"
        "Agradecemos pela oportunidade de apresentar nossa proposta técnico-comercial e pela "
        "confiança em considerar a ZFW Engenharia para contribuir com este fornecimento.\n\n"
        "Encaminhamos em anexo a oferta elaborada com base nas informações recebidas e nas "
        "condições técnicas avaliadas até o momento. Buscamos estruturar uma solução alinhada "
        "às necessidades do projeto, mantendo a proposta dentro de uma condição técnica e "
        "comercial viável para ambas as partes.\n\n"
        "Permanecemos à disposição para esclarecer eventuais dúvidas, realizar ajustes que se "
        "façam necessários ou complementar qualquer informação referente ao escopo apresentado.\n\n"
        "Será um prazer contribuir com este projeto.\n\n"
        "Atenciosamente,\n"
        "ZFW Engenharia"
    )


@transaction.atomic
def enviar_oferta_ao_cliente(
    orcamento: Orcamento,
    *,
    destinatario_nome: str = "",
    destinatario_email: str = "",
    destinatario_emails: list[str] | None = None,
    assunto: str = "",
    mensagem: str = "",
    enviar_email: bool = False,
    usuario=None,
) -> tuple[Orcamento, OrcamentoOfertaEnvio, str]:
    """
    Cria snapshot (se necessário), PDF, convite público, registro de envio e opcionalmente e-mail.
    Retorna (orcamento, envio, link_publico).
    """
    _garantir_pronto_para_envio(orcamento)
    snapshot = criar_snapshot_envio_orcamento(orcamento, usuario=usuario)
    preview = montar_preview_oferta(orcamento)
    pdf_bytes = gerar_pdf_oferta_bytes(preview)
    nome_pdf = nome_arquivo_pdf_oferta(preview)

    versao = _proxima_versao_pdf(orcamento)
    arquivo = OrcamentoOfertaArquivo(
        orcamento=orcamento,
        tipo=TipoArquivoOfertaChoices.PDF_FINAL,
        nome_original=nome_pdf,
        content_type="application/pdf",
        tamanho_bytes=len(pdf_bytes),
        versao=versao,
        criado_por=usuario if getattr(usuario, "is_authenticated", False) else None,
    )
    arquivo.arquivo.save(nome_pdf, ContentFile(pdf_bytes), save=False)
    arquivo.save()

    convite = criar_convite_oferta(orcamento, snapshot, usuario=usuario)
    link = montar_url_convite_publico(convite.token)
    emails_destino = _normalizar_destinatarios(destinatario_email, destinatario_emails)

    canal = CanalEnvioOfertaChoices.LINK
    email_ok = False
    email_erro = ""
    if enviar_email:
        canal = CanalEnvioOfertaChoices.EMAIL
        if not email_configurado():
            email_erro = "E-mail não configurado no servidor."
        else:
            try:
                corpo = mensagem.strip() or _mensagem_padrao(destinatario_nome)
                enviar_email_oferta(
                    destinatario=emails_destino[0] if emails_destino else "",
                    destinatarios=emails_destino,
                    assunto=assunto or _assunto_padrao(orcamento),
                    corpo=corpo,
                    pdf_bytes=pdf_bytes,
                    nome_arquivo_pdf=nome_pdf,
                )
                email_ok = True
            except Exception as exc:
                email_erro = str(exc)

    envio = OrcamentoOfertaEnvio.objects.create(
        orcamento=orcamento,
        pdf_final=arquivo,
        convite=convite,
        canal=canal,
        link_publico=link,
        email_enviado=email_ok,
        email_erro=email_erro,
        destinatario_nome=destinatario_nome,
        destinatario_email=emails_destino[0] if emails_destino else destinatario_email,
        destinatario_emails=", ".join(emails_destino),
        assunto=assunto,
        mensagem=mensagem,
        enviado_por=usuario if getattr(usuario, "is_authenticated", False) else None,
    )

    orcamento.status = StatusOrcamentoChoices.ENVIADO
    orcamento.save(update_fields=("status", "codigo", "codigo_base", "revisao", "atualizado_em"))
    orcamento.refresh_from_db()
    return orcamento, envio, link
