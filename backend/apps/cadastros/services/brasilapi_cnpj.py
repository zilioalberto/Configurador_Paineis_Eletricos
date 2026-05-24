"""
Consulta CNPJ na Brasil API e normalizacao para cadastro de parceiros.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.utils import timezone

from apps.cadastros.services.cnpj_security import (
    brasilapi_cnpj_url,
    max_cnaes_cnpj,
    max_response_bytes_cnpj,
    max_socios_cnpj,
    timeout_cnpj_sec,
)
from core.security.sanitize import (
    sanitize_cnae,
    sanitize_cep,
    sanitize_email,
    sanitize_phone,
    sanitize_text,
    sanitize_uf,
)
from core.validators.documentos import DocumentoInvalidoError, validar_cnpj_digitos


class CnpjConsultaError(Exception):
    """Erro de validacao ou resposta da consulta de CNPJ."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class SocioCnpjPreview:
    nome: str
    qualificacao: str
    data_entrada: date | None
    faixa_etaria: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "nome": self.nome,
            "qualificacao": self.qualificacao,
            "data_entrada": self.data_entrada.isoformat() if self.data_entrada else None,
            "faixa_etaria": self.faixa_etaria,
        }


@dataclass
class CnaeCnpjPreview:
    codigo: str
    descricao: str
    principal: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "codigo": self.codigo,
            "descricao": self.descricao,
            "principal": self.principal,
        }


@dataclass
class EnderecoCnpjPreview:
    nome: str
    logradouro: str
    numero: str
    complemento: str
    bairro: str
    municipio: str
    uf: str
    cep: str
    principal: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {
            "nome": self.nome,
            "logradouro": self.logradouro,
            "numero": self.numero,
            "complemento": self.complemento,
            "bairro": self.bairro,
            "municipio": self.municipio,
            "uf": self.uf,
            "cep": self.cep,
            "principal": self.principal,
        }


@dataclass
class CnpjConsultaPreview:
    documento: str
    razao_social: str
    nome_fantasia: str
    email: str
    telefone: str
    situacao_cadastral: str
    situacao_cadastral_codigo: int | None
    data_inicio_atividade: date | None
    capital_social: Decimal | None
    cnae_fiscal: str
    cnae_fiscal_descricao: str
    natureza_juridica: str
    matriz_filial: str
    endereco: EnderecoCnpjPreview | None
    cnaes: list[CnaeCnpjPreview] = field(default_factory=list)
    socios: list[SocioCnpjPreview] = field(default_factory=list)
    consultado_em: datetime = field(default_factory=timezone.now)

    def as_dict(self) -> dict[str, Any]:
        return {
            "documento": self.documento,
            "razao_social": self.razao_social,
            "nome_fantasia": self.nome_fantasia,
            "email": self.email,
            "telefone": self.telefone,
            "situacao_cadastral": self.situacao_cadastral,
            "situacao_cadastral_codigo": self.situacao_cadastral_codigo,
            "data_inicio_atividade": (
                self.data_inicio_atividade.isoformat() if self.data_inicio_atividade else None
            ),
            "capital_social": str(self.capital_social) if self.capital_social is not None else None,
            "cnae_fiscal": self.cnae_fiscal,
            "cnae_fiscal_descricao": self.cnae_fiscal_descricao,
            "natureza_juridica": self.natureza_juridica,
            "matriz_filial": self.matriz_filial,
            "endereco": self.endereco.as_dict() if self.endereco else None,
            "cnaes": [c.as_dict() for c in self.cnaes],
            "socios": [s.as_dict() for s in self.socios],
            "consultado_em": self.consultado_em.isoformat(),
        }


def normalizar_cnpj(raw: str) -> str:
    """Extrai digitos e valida CNPJ (formato + digitos verificadores)."""
    try:
        return validar_cnpj_digitos(raw or "")
    except DocumentoInvalidoError as exc:
        raise CnpjConsultaError(str(exc), status_code=400) from exc


def _parse_date(raw: Any) -> date | None:
    if not raw:
        return None
    text = str(raw).strip()[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _parse_decimal(raw: Any) -> Decimal | None:
    if raw is None or raw == "":
        return None
    try:
        return Decimal(str(raw))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _format_telefone(ddd_tel: str) -> str:
    digits = re.sub(r"\D", "", ddd_tel or "")
    if len(digits) < 10:
        return ""
    if len(digits) == 10:
        return f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    if len(digits) == 11:
        return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    return digits


def _montar_logradouro(payload: dict[str, Any]) -> str:
    tipo = (payload.get("descricao_tipo_de_logradouro") or "").strip()
    nome = (payload.get("logradouro") or "").strip()
    if tipo and nome:
        return f"{tipo} {nome}".strip()
    return tipo or nome


def _matriz_filial_label(payload: dict[str, Any]) -> str:
    desc = (payload.get("descricao_identificador_matriz_filial") or "").strip()
    if desc:
        return desc
    code = payload.get("identificador_matriz_filial")
    if code == 1:
        return "MATRIZ"
    if code == 2:
        return "FILIAL"
    return ""


def sanitizar_preview(preview: CnpjConsultaPreview) -> CnpjConsultaPreview:
    """Remove conteudo malicioso e limita tamanhos antes de retornar ou persistir."""
    endereco: EnderecoCnpjPreview | None = None
    if preview.endereco:
        end = preview.endereco
        endereco = EnderecoCnpjPreview(
            nome=sanitize_text(end.nome, max_length=80),
            logradouro=sanitize_text(end.logradouro, max_length=255),
            numero=sanitize_text(end.numero, max_length=20),
            complemento=sanitize_text(end.complemento, max_length=120),
            bairro=sanitize_text(end.bairro, max_length=120),
            municipio=sanitize_text(end.municipio, max_length=120),
            uf=sanitize_uf(end.uf),
            cep=sanitize_cep(end.cep),
            principal=end.principal,
        )

    cnaes: list[CnaeCnpjPreview] = []
    for ordem, cnae in enumerate(preview.cnaes[:max_cnaes_cnpj()]):
        codigo = sanitize_cnae(cnae.codigo)
        if not codigo:
            continue
        cnaes.append(
            CnaeCnpjPreview(
                codigo=codigo,
                descricao=sanitize_text(cnae.descricao, max_length=255),
                principal=cnae.principal,
            )
        )

    principal = _cnae_principal(cnaes)
    cnae_fiscal = principal.codigo if principal else sanitize_cnae(preview.cnae_fiscal)
    cnae_descricao = (
        principal.descricao if principal else sanitize_text(preview.cnae_fiscal_descricao, max_length=255)
    )

    socios: list[SocioCnpjPreview] = []
    for socio in preview.socios[:max_socios_cnpj()]:
        nome = sanitize_text(socio.nome, max_length=255)
        if not nome:
            continue
        socios.append(
            SocioCnpjPreview(
                nome=nome,
                qualificacao=sanitize_text(socio.qualificacao, max_length=120),
                data_entrada=socio.data_entrada,
                faixa_etaria=sanitize_text(socio.faixa_etaria, max_length=80),
            )
        )

    razao = sanitize_text(preview.razao_social, max_length=255)
    if not razao:
        raise CnpjConsultaError("Resposta da Receita sem razao social valida.", status_code=502)

    return CnpjConsultaPreview(
        documento=preview.documento,
        razao_social=razao,
        nome_fantasia=sanitize_text(preview.nome_fantasia, max_length=255) or razao,
        email=sanitize_email(preview.email),
        telefone=sanitize_phone(preview.telefone),
        situacao_cadastral=sanitize_text(preview.situacao_cadastral, max_length=40),
        situacao_cadastral_codigo=preview.situacao_cadastral_codigo,
        data_inicio_atividade=preview.data_inicio_atividade,
        capital_social=preview.capital_social,
        cnae_fiscal=cnae_fiscal,
        cnae_fiscal_descricao=cnae_descricao,
        natureza_juridica=sanitize_text(preview.natureza_juridica, max_length=120),
        matriz_filial=sanitize_text(preview.matriz_filial, max_length=40),
        endereco=endereco,
        cnaes=cnaes,
        socios=socios,
        consultado_em=preview.consultado_em,
    )


def _cnae_principal(cnaes: list[CnaeCnpjPreview]) -> CnaeCnpjPreview | None:
    for cnae in cnaes:
        if cnae.principal:
            return cnae
    return cnaes[0] if cnaes else None


def _map_cnaes(payload: dict[str, Any]) -> list[CnaeCnpjPreview]:
    cnaes: list[CnaeCnpjPreview] = []
    vistos: set[str] = set()

    codigo_principal = payload.get("cnae_fiscal")
    if codigo_principal is not None and str(codigo_principal).strip():
        codigo = str(codigo_principal).strip()
        codigo_limpo = re.sub(r"\D", "", codigo)[:7]
        if codigo_limpo and codigo_limpo not in vistos:
            vistos.add(codigo_limpo)
            cnaes.append(
                CnaeCnpjPreview(
                    codigo=codigo_limpo,
                    descricao=(payload.get("cnae_fiscal_descricao") or "").strip()[:255],
                    principal=True,
                )
            )

    for item in payload.get("cnaes_secundarios") or []:
        if not isinstance(item, dict):
            continue
        codigo_raw = item.get("codigo")
        if codigo_raw is None:
            continue
        codigo_limpo = re.sub(r"\D", "", str(codigo_raw))[:7]
        if not codigo_limpo or codigo_limpo in vistos:
            continue
        vistos.add(codigo_limpo)
        cnaes.append(
            CnaeCnpjPreview(
                codigo=codigo_limpo,
                descricao=(item.get("descricao") or "").strip()[:255],
                principal=False,
            )
        )

    return cnaes[:max_cnaes_cnpj()]


def _map_socios(qsa: list[Any]) -> list[SocioCnpjPreview]:
    socios: list[SocioCnpjPreview] = []
    for idx, item in enumerate(qsa or []):
        if not isinstance(item, dict):
            continue
        nome = (item.get("nome_socio") or "").strip()
        if not nome:
            continue
        socios.append(
            SocioCnpjPreview(
                nome=nome,
                qualificacao=(item.get("qualificacao_socio") or "").strip(),
                data_entrada=_parse_date(item.get("data_entrada_sociedade")),
                faixa_etaria=(item.get("faixa_etaria") or "").strip(),
            )
        )
    return socios[:max_socios_cnpj()]


def _map_endereco(payload: dict[str, Any]) -> EnderecoCnpjPreview | None:
    logradouro = _montar_logradouro(payload)
    municipio = (payload.get("municipio") or "").strip()
    uf = (payload.get("uf") or "").strip().upper()[:2]
    if not any((logradouro, municipio, uf)):
        return None
    nome_end = _matriz_filial_label(payload) or "Sede"
    return EnderecoCnpjPreview(
        nome=nome_end.title() if nome_end.isupper() else nome_end,
        logradouro=logradouro,
        numero=(payload.get("numero") or "").strip(),
        complemento=(payload.get("complemento") or "").strip(),
        bairro=(payload.get("bairro") or "").strip(),
        municipio=municipio,
        uf=uf,
        cep=re.sub(r"\D", "", (payload.get("cep") or ""))[:8],
        principal=True,
    )


def mapear_resposta_brasilapi(payload: dict[str, Any]) -> CnpjConsultaPreview:
    documento = normalizar_cnpj(payload.get("cnpj") or "")
    razao = (payload.get("razao_social") or "").strip()
    if not razao:
        raise CnpjConsultaError("Resposta da Receita sem razao social.", status_code=502)

    fantasia = (payload.get("nome_fantasia") or "").strip() or razao
    cnaes = _map_cnaes(payload)
    principal = _cnae_principal(cnaes)

    preview = CnpjConsultaPreview(
        documento=documento,
        razao_social=razao,
        nome_fantasia=fantasia,
        email=(payload.get("email") or "").strip(),
        telefone=_format_telefone(payload.get("ddd_telefone_1") or ""),
        situacao_cadastral=(payload.get("descricao_situacao_cadastral") or "").strip(),
        situacao_cadastral_codigo=payload.get("situacao_cadastral"),
        data_inicio_atividade=_parse_date(payload.get("data_inicio_atividade")),
        capital_social=_parse_decimal(payload.get("capital_social")),
        cnae_fiscal=principal.codigo if principal else "",
        cnae_fiscal_descricao=principal.descricao if principal else "",
        natureza_juridica=(payload.get("natureza_juridica") or "").strip()[:120],
        matriz_filial=_matriz_filial_label(payload),
        endereco=_map_endereco(payload),
        cnaes=cnaes,
        socios=_map_socios(payload.get("qsa") or []),
    )
    return sanitizar_preview(preview)


def consultar_cnpj_brasilapi(cnpj: str) -> CnpjConsultaPreview:
    """Busca dados na Brasil API e devolve preview normalizado e sanitizado."""
    documento = normalizar_cnpj(cnpj)
    url = brasilapi_cnpj_url().format(cnpj=documento)
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "ZFW-Configurador/1.0"})

    max_bytes = max_response_bytes_cnpj()
    try:
        with urlopen(request, timeout=timeout_cnpj_sec()) as response:
            raw_bytes = response.read(max_bytes + 1)
            if len(raw_bytes) > max_bytes:
                raise CnpjConsultaError(
                    "Resposta da consulta de CNPJ excede o tamanho permitido.",
                    status_code=502,
                )
            raw = raw_bytes.decode("utf-8")
    except HTTPError as exc:
        if exc.code == 404:
            raise CnpjConsultaError("CNPJ nao encontrado na Receita Federal.", status_code=404) from exc
        raise CnpjConsultaError(
            "Nao foi possivel consultar o CNPJ na Receita Federal.",
            status_code=502,
        ) from exc
    except URLError as exc:
        raise CnpjConsultaError(
            "Servico de consulta de CNPJ indisponivel. Tente novamente.",
            status_code=503,
        ) from exc

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise CnpjConsultaError("Resposta invalida da consulta de CNPJ.", status_code=502) from exc

    if not isinstance(payload, dict):
        raise CnpjConsultaError("Resposta invalida da consulta de CNPJ.", status_code=502)

    return mapear_resposta_brasilapi(payload)
