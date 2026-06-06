"""Registro de aceite/recusa/assinatura pelo cliente (link público)."""
from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.orcamentos.models import (
    DecisaoOfertaClienteChoices,
    OrcamentoOfertaArquivo,
    OrcamentoOfertaConvite,
    OrcamentoOfertaRespostaCliente,
    StatusOrcamentoChoices,
    TipoArquivoOfertaChoices,
)
from apps.orcamentos.services.convite_oferta import obter_convite_por_token


def _hash_snapshot(snapshot) -> str:
    payload = json.dumps(
        {"dados": snapshot.dados, "itens": snapshot.itens, "total": str(snapshot.total)},
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _decodificar_assinatura_png(data_url: str) -> bytes:
    raw = (data_url or "").strip()
    if not raw:
        raise ValueError("Assinatura não informada.")
    match = re.match(r"^data:image/(png|jpeg);base64,(.+)$", raw, re.I | re.S)
    if match:
        raw = match.group(2)
    try:
        return base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Formato de assinatura inválido.") from exc


@transaction.atomic
def registrar_resposta_oferta_publica(
    token: str,
    *,
    decisao: str,
    nome_responsavel: str,
    cargo: str = "",
    email: str = "",
    observacao: str = "",
    assinatura_data_url: str = "",
    ip: str | None = None,
    user_agent: str = "",
) -> OrcamentoOfertaRespostaCliente:
    convite = obter_convite_por_token(token)
    orcamento = convite.orcamento

    if decisao not in (
        DecisaoOfertaClienteChoices.APROVADO,
        DecisaoOfertaClienteChoices.REJEITADO,
    ):
        raise ValueError("Decisão inválida.")

    if not nome_responsavel.strip():
        raise ValueError("Informe o nome do responsável.")

    resposta, _created = OrcamentoOfertaRespostaCliente.objects.select_for_update().get_or_create(
        convite=convite,
        defaults={"hash_snapshot": _hash_snapshot(convite.snapshot)},
    )
    if resposta.decisao != DecisaoOfertaClienteChoices.PENDENTE:
        raise ValueError("Esta oferta já foi respondida.")

    resposta.decisao = decisao
    resposta.nome_responsavel = nome_responsavel.strip()[:180]
    resposta.cargo = (cargo or "").strip()[:120]
    resposta.email = (email or "").strip()
    resposta.observacao = (observacao or "").strip()
    resposta.aceite_em = timezone.now()
    resposta.ip = ip
    resposta.user_agent = (user_agent or "")[:2000]
    resposta.hash_snapshot = _hash_snapshot(convite.snapshot)

    if decisao == DecisaoOfertaClienteChoices.APROVADO and assinatura_data_url.strip():
        png = _decodificar_assinatura_png(assinatura_data_url)
        nome = f"assinatura_{orcamento.codigo.replace(' ', '_')}.png"
        resposta.assinatura_imagem.save(nome, ContentFile(png), save=False)

    resposta.save()

    if decisao == DecisaoOfertaClienteChoices.APROVADO:
        orcamento.status = StatusOrcamentoChoices.APROVADO
    else:
        orcamento.status = StatusOrcamentoChoices.REJEITADO
    orcamento.save(update_fields=("status", "atualizado_em"))

    from apps.notificacoes.services.notificar_oferta_cliente import (
        notificar_resposta_oferta_cliente,
    )

    notificar_resposta_oferta_cliente(convite, resposta)

    return resposta


@transaction.atomic
def anexar_pdf_assinado_cliente(
    token: str,
    *,
    arquivo_bytes: bytes,
    nome_original: str,
) -> OrcamentoOfertaArquivo:
    convite = obter_convite_por_token(token)
    resposta = getattr(convite, "resposta", None)
    if not resposta or resposta.decisao != DecisaoOfertaClienteChoices.APROVADO:
        raise ValueError("Aprove a oferta antes de enviar o PDF assinado.")

    orcamento = convite.orcamento
    versao = (
        OrcamentoOfertaArquivo.objects.filter(
            orcamento=orcamento,
            tipo=TipoArquivoOfertaChoices.PDF_ASSINADO_CLIENTE,
        ).aggregate(m=Max("versao"))
        .get("m")
        or 0
    ) + 1
    nome = nome_original if nome_original.lower().endswith(".pdf") else f"{nome_original}.pdf"
    registro = OrcamentoOfertaArquivo(
        orcamento=orcamento,
        tipo=TipoArquivoOfertaChoices.PDF_ASSINADO_CLIENTE,
        nome_original=nome,
        content_type="application/pdf",
        tamanho_bytes=len(arquivo_bytes),
        versao=versao,
    )
    registro.arquivo.save(nome, ContentFile(arquivo_bytes), save=False)
    registro.save()
    resposta.pdf_assinado = registro
    resposta.save(update_fields=("pdf_assinado",))
    return registro
