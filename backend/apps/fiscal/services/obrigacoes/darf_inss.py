"""Valor da guia DARF INSS a partir do PDF federal (separado do DAS Simples Nacional)."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from apps.fiscal.choices import (
    StatusObrigacaoFiscalChoices,
    TipoAnexoObrigacaoFiscalChoices,
    TipoObrigacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import AnexoObrigacaoFiscal, ObrigacaoFiscal, PacoteObrigacaoFiscal
from apps.fiscal.services.obrigacoes.das_simples import CODIGOS_COMPOSICAO_SIMPLES, valor_das_pdf_simples
from apps.fiscal.services.obrigacoes.pdf_util import eh_documento_darf, eh_documento_simples_nacional

CODIGOS_COMPOSICAO_DARF = frozenset({"1082", "1099", "0561", "1138"})


def _decimal_valor(valor) -> Decimal | None:
    if valor in (None, ""):
        return None
    try:
        parsed = Decimal(str(valor))
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _anexo_parece_darf_inss(anexo: AnexoObrigacaoFiscal) -> bool:
    nome = (anexo.nome_original or "").lower()
    if "simples nacional" in nome or ("simples" in nome and "nacional" in nome):
        return False
    if anexo.tipo_arquivo == TipoAnexoObrigacaoFiscalChoices.SIMPLES:
        return False
    parsed = anexo.parsed_data or {}
    preview = parsed.get("texto_preview") or parsed.get("texto") or ""
    if eh_documento_simples_nacional(anexo.nome_original, preview, parsed):
        return False
    if "darf" in nome:
        return True
    if anexo.tipo_arquivo == TipoAnexoObrigacaoFiscalChoices.DARF:
        return eh_documento_darf(anexo.nome_original, preview)
    return False


def anexo_darf_inss(pacote: PacoteObrigacaoFiscal) -> AnexoObrigacaoFiscal | None:
    """Anexo da guia DARF INSS (nunca o PDF do Simples Nacional)."""
    candidatos = [a for a in pacote.anexos.order_by("-criado_em") if _anexo_parece_darf_inss(a)]
    if not candidatos:
        return None

    def _score(anexo: AnexoObrigacaoFiscal) -> tuple[int, int]:
        parsed = anexo.parsed_data or {}
        linhas = parsed.get("linhas_composicao") or []
        qtd = sum(1 for l in linhas if str(l.get("codigo") or "") in CODIGOS_COMPOSICAO_DARF)
        nome_bonus = 1 if "darf" in (anexo.nome_original or "").lower() else 0
        parse_bonus = 1 if anexo.parse_sucesso else 0
        return (qtd, nome_bonus + parse_bonus)

    return max(candidatos, key=_score)


def _texto_anexo_darf(anexo: AnexoObrigacaoFiscal) -> str:
    parsed = anexo.parsed_data or {}
    preview = (parsed.get("texto_preview") or parsed.get("texto") or "").strip()
    if len(preview) >= 200:
        return preview
    if anexo.arquivo:
        from apps.fiscal.services.obrigacoes.pdf_util import extrair_texto_pdf

        with anexo.arquivo.open("rb") as handle:
            return extrair_texto_pdf(handle.read())
    return preview


def _tem_linhas_darf(parsed: dict) -> bool:
    return any(
        str(linha.get("codigo") or "") in CODIGOS_COMPOSICAO_DARF
        for linha in (parsed.get("linhas_composicao") or [])
    )


def _tem_linhas_simples(parsed: dict) -> bool:
    return any(
        str(linha.get("codigo") or "") in CODIGOS_COMPOSICAO_SIMPLES
        for linha in (parsed.get("linhas_composicao") or [])
    )


def valor_parece_das_contaminado(pacote: PacoteObrigacaoFiscal, parsed: dict) -> bool:
    """True quando o valor parece ser o total do DAS, não da guia DARF INSS."""
    valor = _decimal_valor(parsed.get("valor"))
    if valor is None:
        return False
    if _tem_linhas_darf(parsed) and not _tem_linhas_simples(parsed):
        return False
    das_valor, _ = valor_das_pdf_simples(pacote)
    if das_valor is None or valor != das_valor:
        return False
    return True


def _precisa_reparse_darf(parsed: dict, anexo: AnexoObrigacaoFiscal) -> bool:
    if parsed.get("tipo_obrigacao") != TipoObrigacaoFiscalChoices.INSS_DARF:
        return True
    if anexo.tipo_arquivo == TipoAnexoObrigacaoFiscalChoices.SIMPLES:
        return True
    if _tem_linhas_simples(parsed):
        return True
    if not _tem_linhas_darf(parsed) and parsed.get("sucesso"):
        return True
    return False


def parsed_darf_do_pdf(pacote: PacoteObrigacaoFiscal) -> dict | None:
    """Parse efetivo da DARF INSS (reprocessa importações antigas ou contaminadas)."""
    anexo = anexo_darf_inss(pacote)
    if not anexo:
        return None

    parsed = dict(anexo.parsed_data or {})
    if _precisa_reparse_darf(parsed, anexo):
        from apps.fiscal.services.obrigacoes.parsers.darf import parse_darf

        texto = _texto_anexo_darf(anexo)
        if texto.strip():
            reparsed = parse_darf(texto)
            if _decimal_valor(reparsed.get("valor")) and not valor_parece_das_contaminado(pacote, reparsed):
                reparsed["tipo_anexo"] = TipoAnexoObrigacaoFiscalChoices.DARF
                return reparsed
            return None

    if valor_parece_das_contaminado(pacote, parsed):
        return None
    return parsed


def valor_darf_pdf(pacote: PacoteObrigacaoFiscal) -> tuple[Decimal | None, AnexoObrigacaoFiscal | None]:
    """Valor total da guia DARF INSS conforme PDF importado."""
    anexo = anexo_darf_inss(pacote)
    if not anexo:
        return None, None
    parsed = parsed_darf_do_pdf(pacote) or {}
    valor = _decimal_valor(parsed.get("valor"))
    if valor is not None:
        return valor, anexo
    return None, anexo


def darf_importado_de_pdf(pacote: PacoteObrigacaoFiscal) -> bool:
    valor, _anexo = valor_darf_pdf(pacote)
    return valor is not None


def sincronizar_obrigacao_darf(pacote: PacoteObrigacaoFiscal, parsed: dict) -> ObrigacaoFiscal | None:
    if parsed.get("tipo_obrigacao") != TipoObrigacaoFiscalChoices.INSS_DARF:
        parsed = {**parsed, "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF}

    valor = _decimal_valor(parsed.get("valor"))
    if valor is None or valor_parece_das_contaminado(pacote, parsed):
        return None

    venc_str = parsed.get("data_vencimento")
    vencimento = date.fromisoformat(venc_str) if venc_str else None

    obrigacao, _ = ObrigacaoFiscal.objects.update_or_create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.INSS_DARF,
        defaults={
            "descricao": parsed.get("descricao") or "INSS — DARF",
            "valor": valor,
            "data_vencimento": vencimento,
            "numero_documento": parsed.get("numero_documento") or "",
            "dados_extra": {
                **(parsed.get("dados_extra") or {}),
                "importado_de_anexo": TipoAnexoObrigacaoFiscalChoices.DARF,
                "parse_sucesso": bool(parsed.get("sucesso")),
                "fonte_valor": "pdf_darf",
            },
            "status": StatusObrigacaoFiscalChoices.PENDENTE,
        },
    )

    obrigacao.linhas_composicao.all().delete()
    for linha in parsed.get("linhas_composicao") or []:
        codigo = str(linha.get("codigo") or "")
        if codigo not in CODIGOS_COMPOSICAO_DARF:
            continue
        valor_linha = _decimal_valor(linha.get("valor"))
        if valor_linha is None:
            continue
        from apps.fiscal.models_obrigacoes import LinhaComposicaoObrigacao

        LinhaComposicaoObrigacao.objects.create(
            obrigacao=obrigacao,
            codigo=codigo,
            descricao=linha.get("descricao") or "",
            valor=valor_linha,
        )

    return obrigacao


def limpar_inss_darf_contaminado(pacote: PacoteObrigacaoFiscal) -> ObrigacaoFiscal | None:
    """Remove valor da obrigação INSS_DARF quando é o total do DAS (importação antiga)."""
    if darf_importado_de_pdf(pacote):
        return pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.INSS_DARF).first()

    obrigacao = pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.INSS_DARF).first()
    if not obrigacao or obrigacao.valor <= 0:
        return obrigacao

    extra = dict(obrigacao.dados_extra or {})
    if extra.get("fonte_valor") == "manual":
        return obrigacao

    das_valor, _ = valor_das_pdf_simples(pacote)
    if das_valor is not None and obrigacao.valor == das_valor:
        obrigacao.valor = Decimal("0")
        extra["fonte_valor"] = "manual"
        extra["valor_das_removido"] = True
        obrigacao.dados_extra = extra
        obrigacao.save(update_fields=["valor", "dados_extra", "atualizado_em"])
    return obrigacao


def garantir_inss_darf_do_pdf(pacote: PacoteObrigacaoFiscal) -> ObrigacaoFiscal | None:
    """Fonte única: alinha obrigação INSS_DARF ao PDF DARF (nunca ao Simples Nacional)."""
    anexo = anexo_darf_inss(pacote)
    if not anexo:
        return limpar_inss_darf_contaminado(pacote)

    parsed = parsed_darf_do_pdf(pacote)
    if not parsed or not _decimal_valor(parsed.get("valor")):
        return limpar_inss_darf_contaminado(pacote)

    obrigacao = sincronizar_obrigacao_darf(pacote, parsed)

    anexo_changed = False
    if anexo.tipo_arquivo != TipoAnexoObrigacaoFiscalChoices.DARF:
        anexo.tipo_arquivo = TipoAnexoObrigacaoFiscalChoices.DARF
        anexo_changed = True
    if anexo.parsed_data != parsed:
        anexo.parsed_data = parsed
        anexo_changed = True
    if anexo.parse_sucesso != bool(parsed.get("sucesso")):
        anexo.parse_sucesso = bool(parsed.get("sucesso"))
        anexo_changed = True
    if anexo.parse_erros != "; ".join(parsed.get("erros") or []):
        anexo.parse_erros = "; ".join(parsed.get("erros") or [])
        anexo_changed = True
    if obrigacao and anexo.obrigacao_id != obrigacao.id:
        anexo.obrigacao = obrigacao
        anexo_changed = True
    if anexo_changed:
        anexo.save(
            update_fields=[
                "tipo_arquivo",
                "parsed_data",
                "parse_sucesso",
                "parse_erros",
                "obrigacao",
            ]
        )

    return obrigacao
