"""
Validacao e sanitizacao de cadastro manual de parceiros.
"""
from __future__ import annotations

from rest_framework import serializers

from apps.cadastros.models import TipoPessoaParceiroChoices
from core.security.sanitize import (
    sanitize_cnae,
    sanitize_cep,
    sanitize_email,
    sanitize_phone,
    sanitize_text,
    sanitize_uf,
)
from core.validators.documentos import (
    DocumentoInvalidoError,
    validar_cnpj_digitos,
    validar_cpf_digitos,
)


def _validation_error(exc: DocumentoInvalidoError) -> serializers.ValidationError:
    return serializers.ValidationError(str(exc))


def normalizar_documento_parceiro(tipo_pessoa: str, documento: str) -> str:
    """Valida e normaliza documento conforme tipo de pessoa."""
    raw = (documento or "").strip()
    if not raw:
        raise serializers.ValidationError("Documento e obrigatorio.")

    if tipo_pessoa == TipoPessoaParceiroChoices.PESSOA_JURIDICA:
        try:
            return validar_cnpj_digitos(raw)
        except DocumentoInvalidoError as exc:
            raise _validation_error(exc) from exc

    if tipo_pessoa == TipoPessoaParceiroChoices.PESSOA_FISICA:
        try:
            return validar_cpf_digitos(raw)
        except DocumentoInvalidoError as exc:
            raise _validation_error(exc) from exc

    cleaned = sanitize_text(raw, max_length=20)
    if not cleaned:
        raise serializers.ValidationError("Documento e obrigatorio.")
    return cleaned


def sanitizar_attrs_parceiro(attrs: dict) -> dict:
    """Sanitiza campos textuais do parceiro antes de create/update."""
    result = dict(attrs)
    if "razao_social" in result:
        result["razao_social"] = sanitize_text(result.get("razao_social"), max_length=255)
    if "nome_fantasia" in result:
        result["nome_fantasia"] = sanitize_text(result.get("nome_fantasia"), max_length=255)
    if "inscricao_estadual" in result:
        result["inscricao_estadual"] = sanitize_text(result.get("inscricao_estadual"), max_length=20)
    if "email" in result:
        result["email"] = sanitize_email(result.get("email"))
    if "telefone" in result:
        result["telefone"] = sanitize_phone(result.get("telefone"))
    if "situacao_cadastral" in result:
        result["situacao_cadastral"] = sanitize_text(result.get("situacao_cadastral"), max_length=40)
    if "cnae_fiscal" in result:
        result["cnae_fiscal"] = sanitize_cnae(result.get("cnae_fiscal"))
    if "cnae_fiscal_descricao" in result:
        result["cnae_fiscal_descricao"] = sanitize_text(
            result.get("cnae_fiscal_descricao"), max_length=255
        )
    if "natureza_juridica" in result:
        result["natureza_juridica"] = sanitize_text(result.get("natureza_juridica"), max_length=120)
    return result


def sanitizar_attrs_endereco(attrs: dict) -> dict:
    result = dict(attrs)
    for field, max_len in (
        ("nome", 80),
        ("logradouro", 255),
        ("numero", 20),
        ("complemento", 120),
        ("bairro", 120),
        ("municipio", 120),
    ):
        if field in result:
            result[field] = sanitize_text(result.get(field), max_length=max_len)
    if "uf" in result:
        result["uf"] = sanitize_uf(result.get("uf"))
    if "cep" in result:
        result["cep"] = sanitize_cep(result.get("cep"))
    return result


def sanitizar_attrs_contato(attrs: dict) -> dict:
    result = dict(attrs)
    if "nome" in result:
        result["nome"] = sanitize_text(result.get("nome"), max_length=120)
    if "cargo" in result:
        result["cargo"] = sanitize_text(result.get("cargo"), max_length=80)
    if "email" in result:
        result["email"] = sanitize_email(result.get("email"))
    if "telefone" in result:
        result["telefone"] = sanitize_phone(result.get("telefone"))
    if "observacoes" in result:
        result["observacoes"] = sanitize_text(result.get("observacoes"), max_length=2000)
    return result
