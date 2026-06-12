"""Consultas de documentos fiscais com CNPJ divergente da empresa configurada."""
from __future__ import annotations

import csv
import sys
from dataclasses import dataclass
from typing import Iterable, TextIO

from django.conf import settings

from apps.fiscal.models import DocumentoFiscalEmitido, DocumentoFiscalRecebido
from apps.fiscal.utils import normalizar_cnpj

_CSV_CAMPOS = [
    "tipo",
    "public_id",
    "id",
    "numero",
    "serie",
    "data_emissao",
    "valor_total",
    "cnpj_participante",
    "nome_participante",
    "cnpj_contraparte",
    "nome_contraparte",
    "origem_importacao",
]


def cnpj_empresa_fiscal() -> str:
    """CNPJ da ZFW em FISCAL_EMPRESA_CNPJ (somente dígitos)."""
    return normalizar_cnpj(getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or "")


def queryset_emitidas_emitente_divergente():
    """NF-es/NFS-es emitidas importadas com emitente/prestador ≠ empresa configurada."""
    cnpj_empresa = cnpj_empresa_fiscal()
    if len(cnpj_empresa) != 14:
        return DocumentoFiscalEmitido.objects.none()
    return (
        DocumentoFiscalEmitido.objects.exclude(cnpj_emitente=cnpj_empresa)
        .order_by("-data_emissao", "-criada_em")
    )


def queryset_recebidas_destinatario_divergente():
    """NF-es recebidas importadas com destinatário ≠ empresa configurada."""
    cnpj_empresa = cnpj_empresa_fiscal()
    if len(cnpj_empresa) != 14:
        return DocumentoFiscalRecebido.objects.none()
    return (
        DocumentoFiscalRecebido.objects.exclude(cnpj_destinatario=cnpj_empresa)
        .order_by("-data_emissao", "-criada_em")
    )


def _data_emissao_iso(documento) -> str:
    return documento.data_emissao.isoformat() if documento.data_emissao else ""


def linha_emitida_divergente(doc: DocumentoFiscalEmitido) -> dict[str, str]:
    return {
        "tipo": "EMITIDA",
        "public_id": str(doc.public_id),
        "id": str(doc.id),
        "numero": doc.numero,
        "serie": doc.serie,
        "data_emissao": _data_emissao_iso(doc),
        "valor_total": str(doc.valor_total),
        "cnpj_participante": doc.cnpj_emitente,
        "nome_participante": doc.nome_emitente,
        "cnpj_contraparte": doc.cnpj_destinatario,
        "nome_contraparte": doc.nome_destinatario,
        "origem_importacao": doc.origem_importacao,
    }


def linha_recebida_divergente(doc: DocumentoFiscalRecebido) -> dict[str, str]:
    return {
        "tipo": "RECEBIDA",
        "public_id": "",
        "id": str(doc.id),
        "numero": doc.numero,
        "serie": doc.serie,
        "data_emissao": _data_emissao_iso(doc),
        "valor_total": str(doc.valor_total),
        "cnpj_participante": doc.cnpj_destinatario,
        "nome_participante": doc.nome_destinatario,
        "cnpj_contraparte": doc.cnpj_emitente,
        "nome_contraparte": doc.nome_emitente,
        "origem_importacao": doc.origem_importacao,
    }


@dataclass
class ListagemDocumentosDivergentes:
    linhas: list[dict[str, str]]
    total_emitidas: int
    total_recebidas: int


def _slice_queryset(qs, limite: int):
    return qs[:limite] if limite else qs


def coletar_documentos_divergentes(tipo: str, limite: int) -> ListagemDocumentosDivergentes:
    linhas: list[dict[str, str]] = []
    total_emitidas = 0
    total_recebidas = 0

    if tipo in {"emitidas", "ambos"}:
        qs = queryset_emitidas_emitente_divergente()
        total_emitidas = qs.count()
        linhas.extend(linha_emitida_divergente(doc) for doc in _slice_queryset(qs, limite))

    if tipo in {"recebidas", "ambos"}:
        qs = queryset_recebidas_destinatario_divergente()
        total_recebidas = qs.count()
        linhas.extend(linha_recebida_divergente(doc) for doc in _slice_queryset(qs, limite))

    return ListagemDocumentosDivergentes(
        linhas=linhas,
        total_emitidas=total_emitidas,
        total_recebidas=total_recebidas,
    )


def formatar_rotulo_linha_divergente(row: dict[str, str]) -> str:
    rotulo = (
        f"[{row['tipo']}] nº {row['numero']}/{row['serie']} "
        f"— participante {row['nome_participante']} ({row['cnpj_participante']}) "
        f"— valor {row['valor_total']}"
    )
    if row["tipo"] == "EMITIDA":
        return f"{rotulo} — public_id={row['public_id']}"
    return f"{rotulo} — id={row['id']}"


def exportar_linhas_divergentes_csv(linhas: Iterable[dict[str, str]], destino: TextIO | None = None) -> None:
    writer = csv.DictWriter(destino or sys.stdout, fieldnames=_CSV_CAMPOS)
    writer.writeheader()
    writer.writerows(linhas)
