"""Valor e composição do DAS a partir do PDF Simples Nacional."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from apps.fiscal.choices import (
    StatusObrigacaoFiscalChoices,
    TipoAnexoObrigacaoFiscalChoices,
    TipoObrigacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    LinhaComposicaoObrigacao,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
)
from apps.fiscal.services.obrigacoes.pdf_util import eh_documento_simples_nacional

CODIGOS_COMPOSICAO_SIMPLES = frozenset(
    {"1001", "1002", "1004", "1005", "1006", "1007", "1008", "1010", "1011", "1012"}
)

CODIGO_INSS_DAS_SIMPLES = "1006"


def _decimal_valor(valor) -> Decimal | None:
    if valor in (None, ""):
        return None
    try:
        parsed = Decimal(str(valor))
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _anexo_parece_simples_nacional(anexo: AnexoObrigacaoFiscal) -> bool:
    nome = (anexo.nome_original or "").lower()
    if "darf" in nome:
        return False
    parsed = anexo.parsed_data or {}
    preview = parsed.get("texto_preview") or parsed.get("texto") or ""
    if eh_documento_simples_nacional(anexo.nome_original, preview, parsed):
        return True
    linhas = parsed.get("linhas_composicao") or []
    return any(str(linha.get("codigo") or "") in CODIGOS_COMPOSICAO_SIMPLES for linha in linhas)


def anexo_simples_nacional(pacote: PacoteObrigacaoFiscal) -> AnexoObrigacaoFiscal | None:
    """Anexo do DAS / Simples Nacional (prioriza arquivo com composição 1001–1008)."""
    candidatos = [a for a in pacote.anexos.order_by("-criado_em") if _anexo_parece_simples_nacional(a)]

    def _score(anexo: AnexoObrigacaoFiscal) -> tuple[int, int]:
        parsed = anexo.parsed_data or {}
        linhas = parsed.get("linhas_composicao") or []
        qtd = sum(1 for l in linhas if str(l.get("codigo") or "") in CODIGOS_COMPOSICAO_SIMPLES)
        nome_bonus = 1 if "simples nacional" in (anexo.nome_original or "").lower() else 0
        return (qtd, nome_bonus)

    if not candidatos:
        return None
    return max(candidatos, key=_score)


def das_importado_de_pdf(pacote: PacoteObrigacaoFiscal) -> bool:
    """True quando o DAS foi extraído com sucesso do PDF (não escaneado)."""
    valor, _anexo = valor_das_pdf_simples(pacote)
    return valor is not None


def anexo_simples_escaneado(pacote: PacoteObrigacaoFiscal) -> AnexoObrigacaoFiscal | None:
    """Anexo Simples Nacional anexado, porém sem texto extraível (PDF escaneado)."""
    for anexo in pacote.anexos.order_by("-criado_em"):
        nome = (anexo.nome_original or "").lower()
        if "simples nacional" in nome or ("simples" in nome and "nacional" in nome):
            if not anexo.parse_sucesso:
                return anexo
        if anexo.tipo_arquivo == TipoAnexoObrigacaoFiscalChoices.SIMPLES and not anexo.parse_sucesso:
            return anexo
    return None


def _texto_anexo_simples(anexo: AnexoObrigacaoFiscal) -> str:
    parsed = anexo.parsed_data or {}
    preview = (parsed.get("texto_preview") or parsed.get("texto") or "").strip()
    if len(preview) >= 200:
        return preview
    if anexo.arquivo:
        from apps.fiscal.services.obrigacoes.pdf_util import extrair_texto_pdf

        with anexo.arquivo.open("rb") as handle:
            return extrair_texto_pdf(handle.read())
    return preview


def _precisa_reparse_simples(parsed: dict, anexo: AnexoObrigacaoFiscal) -> bool:
    if parsed.get("tipo_obrigacao") != TipoObrigacaoFiscalChoices.DAS:
        return True
    if anexo.tipo_arquivo == TipoAnexoObrigacaoFiscalChoices.DARF:
        return True
    if not (parsed.get("linhas_composicao") or []):
        return True
    return False


def parsed_das_do_pdf(pacote: PacoteObrigacaoFiscal) -> dict | None:
    """Parse efetivo do DAS a partir do PDF Simples Nacional (reprocessa se importação antiga)."""
    anexo = anexo_simples_nacional(pacote)
    if not anexo:
        return None

    parsed = dict(anexo.parsed_data or {})
    if _precisa_reparse_simples(parsed, anexo):
        from apps.fiscal.services.obrigacoes.parsers.simples import parse_simples

        texto = _texto_anexo_simples(anexo)
        if texto.strip():
            reparsed = parse_simples(texto)
            if _decimal_valor(reparsed.get("valor")):
                reparsed["tipo_anexo"] = TipoAnexoObrigacaoFiscalChoices.SIMPLES
                return reparsed
    return parsed


def valor_das_pdf_simples(pacote: PacoteObrigacaoFiscal) -> tuple[Decimal | None, AnexoObrigacaoFiscal | None]:
    """Valor total do DAS conforme PDF Simples Nacional importado."""
    anexo = anexo_simples_nacional(pacote)
    if not anexo:
        return None, None
    parsed = parsed_das_do_pdf(pacote) or {}
    valor = _decimal_valor(parsed.get("valor"))
    if valor is not None:
        return valor, anexo
    return None, anexo


def valor_linha_composicao_pdf_simples(pacote: PacoteObrigacaoFiscal, codigo: str) -> Decimal | None:
    """Valor de uma linha da composição do DAS (ex.: 1006 INSS) a partir do PDF."""
    parsed = parsed_das_do_pdf(pacote)
    if not parsed:
        return None
    for linha in parsed.get("linhas_composicao") or []:
        if str(linha.get("codigo") or "") == codigo:
            return _decimal_valor(linha.get("valor"))
    return None


def linhas_composicao_pdf_simples(pacote: PacoteObrigacaoFiscal) -> list[dict]:
    parsed = parsed_das_do_pdf(pacote)
    if not parsed:
        return []
    return list(parsed.get("linhas_composicao") or [])


def sincronizar_obrigacao_das(pacote: PacoteObrigacaoFiscal, parsed: dict) -> ObrigacaoFiscal | None:
    """Grava/atualiza obrigação DAS a partir do parse do PDF Simples Nacional."""
    if parsed.get("tipo_obrigacao") != TipoObrigacaoFiscalChoices.DAS:
        parsed = {**parsed, "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS}

    valor = _decimal_valor(parsed.get("valor"))
    if valor is None:
        return None

    venc_str = parsed.get("data_vencimento")
    vencimento = date.fromisoformat(venc_str) if venc_str else None

    obrigacao, _ = ObrigacaoFiscal.objects.update_or_create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        defaults={
            "descricao": parsed.get("descricao") or "DAS — Simples Nacional",
            "valor": valor,
            "data_vencimento": vencimento,
            "numero_documento": parsed.get("numero_documento") or "",
            "dados_extra": {
                **(parsed.get("dados_extra") or {}),
                "importado_de_anexo": TipoAnexoObrigacaoFiscalChoices.SIMPLES,
                "parse_sucesso": bool(parsed.get("sucesso")),
                "fonte_valor": "pdf_simples_nacional",
            },
            "status": StatusObrigacaoFiscalChoices.PENDENTE,
        },
    )

    obrigacao.linhas_composicao.all().delete()
    for linha in parsed.get("linhas_composicao") or []:
        codigo = str(linha.get("codigo") or "")
        if codigo not in CODIGOS_COMPOSICAO_SIMPLES:
            continue
        valor_linha = _decimal_valor(linha.get("valor"))
        if valor_linha is None:
            continue
        LinhaComposicaoObrigacao.objects.create(
            obrigacao=obrigacao,
            codigo=codigo,
            descricao=linha.get("descricao") or "",
            valor=valor_linha,
        )

    return obrigacao


def garantir_das_do_pdf(pacote: PacoteObrigacaoFiscal) -> ObrigacaoFiscal | None:
    """Fonte única: alinha obrigação DAS e metadados do anexo ao PDF Simples Nacional."""
    anexo = anexo_simples_nacional(pacote)
    if not anexo:
        return None

    parsed = parsed_das_do_pdf(pacote)
    if not parsed or not _decimal_valor(parsed.get("valor")):
        return None

    obrigacao = sincronizar_obrigacao_das(pacote, parsed)

    anexo_changed = False
    if anexo.tipo_arquivo != TipoAnexoObrigacaoFiscalChoices.SIMPLES:
        anexo.tipo_arquivo = TipoAnexoObrigacaoFiscalChoices.SIMPLES
        anexo_changed = True
    if anexo.parsed_data != parsed:
        anexo.parsed_data = parsed
        anexo_changed = True
    if anexo.parse_sucesso != bool(parsed.get("sucesso")):
        anexo.parse_sucesso = bool(parsed.get("sucesso"))
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
                "obrigacao",
            ]
        )

    return obrigacao


def valor_linha_composicao_das(pacote: PacoteObrigacaoFiscal, codigo: str) -> Decimal | None:
    """Valor da composição do DAS: PDF Simples Nacional ou linhas informadas manualmente."""
    valor_pdf = valor_linha_composicao_pdf_simples(pacote, codigo)
    if valor_pdf is not None:
        return valor_pdf
    obrigacao = pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.DAS).first()
    if not obrigacao:
        return None
    linha = obrigacao.linhas_composicao.filter(codigo=codigo).first()
    return linha.valor if linha else None


def aplicar_linhas_composicao_obrigacao(
    obrigacao: ObrigacaoFiscal,
    linhas: list[dict],
    *,
    fonte: str = "manual",
) -> None:
    obrigacao.linhas_composicao.all().delete()
    for linha in linhas:
        codigo = str(linha.get("codigo") or "")
        if codigo not in CODIGOS_COMPOSICAO_SIMPLES:
            continue
        valor_linha = _decimal_valor(linha.get("valor"))
        if valor_linha is None:
            continue
        LinhaComposicaoObrigacao.objects.create(
            obrigacao=obrigacao,
            codigo=codigo,
            descricao=linha.get("descricao") or "",
            valor=valor_linha,
        )
    extra = dict(obrigacao.dados_extra or {})
    extra["fonte_valor"] = fonte
    extra["composicao_manual"] = fonte == "manual"
    obrigacao.dados_extra = extra
    obrigacao.save(update_fields=["dados_extra", "atualizado_em"])


def garantir_obrigacao_das_editavel(pacote: PacoteObrigacaoFiscal) -> ObrigacaoFiscal | None:
    """Cria obrigação DAS vazia quando há PDF escaneado ou ausência de DAS para preenchimento manual."""
    if das_importado_de_pdf(pacote):
        return pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.DAS).first()

    escaneado = anexo_simples_escaneado(pacote) is not None
    obrigacao = pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.DAS).first()
    if not obrigacao and not escaneado:
        return None

    if not obrigacao:
        obrigacao = ObrigacaoFiscal.objects.create(
            pacote=pacote,
            tipo=TipoObrigacaoFiscalChoices.DAS,
            descricao="DAS — Simples Nacional (informar manualmente)",
            valor=Decimal("0"),
            dados_extra={
                "fonte_valor": "manual",
                "pdf_escaneado": escaneado,
            },
            status=StatusObrigacaoFiscalChoices.PENDENTE,
        )
    elif escaneado:
        extra = dict(obrigacao.dados_extra or {})
        if extra.get("fonte_valor") != "pdf_simples_nacional":
            extra["fonte_valor"] = "manual"
            extra["pdf_escaneado"] = True
            obrigacao.dados_extra = extra
            obrigacao.save(update_fields=["dados_extra", "atualizado_em"])

    if escaneado and obrigacao:
        anexo = anexo_simples_escaneado(pacote)
        if anexo and anexo.obrigacao_id != obrigacao.id:
            anexo.obrigacao = obrigacao
            anexo.save(update_fields=["obrigacao"])

    return obrigacao


def reparar_das_de_anexo_simples(pacote: PacoteObrigacaoFiscal) -> ObrigacaoFiscal | None:
    """Alias retrocompatível."""
    return garantir_das_do_pdf(pacote)
