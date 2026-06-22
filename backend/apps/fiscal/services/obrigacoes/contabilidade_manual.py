"""Valor manual da coluna Contabilidade na conciliação ERP × contabilidade."""
from __future__ import annotations

from decimal import Decimal

from apps.fiscal.choices import (
    TipoObrigacaoFiscalChoices,
    TipoReconciliacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import ObrigacaoFiscal, PacoteObrigacaoFiscal, ReconciliacaoFiscal, SnapshotApuracaoIcms
from apps.fiscal.services.obrigacoes.das_simples import (
    CODIGO_INSS_DAS_SIMPLES,
    aplicar_linhas_composicao_obrigacao,
    das_importado_de_pdf,
    garantir_obrigacao_das_editavel,
)
from apps.fiscal.services.obrigacoes.darf_inss import darf_importado_de_pdf

CHAVE_VALOR_MANUAL = "valor_contabilidade_manual"
CHAVE_FONTE = "fonte_contabilidade"
CHAVE_ICMS_ENTRADAS_MANUAL = "valor_contabil_entradas_manual"
CHAVE_ICMS_SAIDAS_MANUAL = "valor_contabil_saidas_manual"

TIPOS_EDITAVEIS = frozenset(
    {
        TipoReconciliacaoFiscalChoices.DAS,
        TipoReconciliacaoFiscalChoices.DAS_INSS,
        TipoReconciliacaoFiscalChoices.INSS,
        TipoReconciliacaoFiscalChoices.FGTS,
        TipoReconciliacaoFiscalChoices.ISS,
        TipoReconciliacaoFiscalChoices.ICMS,
    }
)

OBRIGACAO_POR_TIPO = {
    TipoReconciliacaoFiscalChoices.DAS: TipoObrigacaoFiscalChoices.DAS,
    TipoReconciliacaoFiscalChoices.INSS: TipoObrigacaoFiscalChoices.INSS_DARF,
    TipoReconciliacaoFiscalChoices.FGTS: TipoObrigacaoFiscalChoices.FGTS,
    TipoReconciliacaoFiscalChoices.ISS: TipoObrigacaoFiscalChoices.ISS,
}


def _dec(valor) -> Decimal | None:
    if valor in (None, ""):
        return None
    try:
        parsed = Decimal(str(valor))
    except (TypeError, ValueError):
        return None
    return parsed


def valor_contabil_manual(pacote: PacoteObrigacaoFiscal, tipo: str) -> Decimal | None:
    rec = pacote.reconciliacoes.filter(tipo=tipo).first()
    if not rec:
        return None
    return _dec((rec.detalhes or {}).get(CHAVE_VALOR_MANUAL))


def valor_icms_manual(pacote: PacoteObrigacaoFiscal, campo: str) -> Decimal | None:
    rec = pacote.reconciliacoes.filter(tipo=TipoReconciliacaoFiscalChoices.ICMS).first()
    if not rec:
        return None
    chave = CHAVE_ICMS_ENTRADAS_MANUAL if campo == "entradas" else CHAVE_ICMS_SAIDAS_MANUAL
    return _dec((rec.detalhes or {}).get(chave))


def resolver_valor_contabil(
    pacote: PacoteObrigacaoFiscal,
    tipo: str,
    valor_pdf: Decimal | None,
) -> Decimal | None:
    """PDF tem prioridade; manual preenche quando o PDF não traz valor."""
    if valor_pdf is not None:
        return valor_pdf
    return valor_contabil_manual(pacote, tipo)


def resolver_valor_icms(
    pacote: PacoteObrigacaoFiscal,
    campo: str,
    valor_pdf: Decimal | None,
) -> Decimal | None:
    if valor_pdf is not None:
        return valor_pdf
    return valor_icms_manual(pacote, campo)


def contabilidade_bloqueada_por_pdf(pacote: PacoteObrigacaoFiscal, tipo: str) -> bool:
    if tipo == TipoReconciliacaoFiscalChoices.DAS:
        return das_importado_de_pdf(pacote)
    if tipo == TipoReconciliacaoFiscalChoices.DAS_INSS:
        return das_importado_de_pdf(pacote)
    if tipo == TipoReconciliacaoFiscalChoices.INSS:
        return darf_importado_de_pdf(pacote)
    return False


def _obter_ou_criar_obrigacao(
    pacote: PacoteObrigacaoFiscal,
    tipo_obrigacao: str,
    *,
    descricao: str,
) -> ObrigacaoFiscal:
    obrigacao, created = ObrigacaoFiscal.objects.get_or_create(
        pacote=pacote,
        tipo=tipo_obrigacao,
        defaults={
            "descricao": descricao,
            "valor": Decimal("0"),
            "dados_extra": {"fonte_valor": "manual"},
        },
    )
    if created:
        return obrigacao
    extra = dict(obrigacao.dados_extra or {})
    if extra.get("fonte_valor") != "pdf_darf" and extra.get("fonte_valor") != "pdf_simples_nacional":
        extra["fonte_valor"] = "manual"
        obrigacao.dados_extra = extra
        obrigacao.save(update_fields=["dados_extra", "atualizado_em"])
    return obrigacao


def _persistir_detalhes_manual(
    pacote: PacoteObrigacaoFiscal,
    tipo: str,
    *,
    valor: Decimal | None = None,
    icms_entradas: Decimal | None = None,
    icms_saidas: Decimal | None = None,
    limpar: bool = False,
) -> None:
    from apps.fiscal.choices import StatusReconciliacaoFiscalChoices

    rec, _ = ReconciliacaoFiscal.objects.get_or_create(
        pacote=pacote,
        tipo=tipo,
        defaults={
            "status": StatusReconciliacaoFiscalChoices.PENDENTE,
            "mensagem": "",
        },
    )
    detalhes = dict(rec.detalhes or {})
    if limpar or valor is None:
        detalhes.pop(CHAVE_VALOR_MANUAL, None)
        detalhes.pop(CHAVE_FONTE, None)
    elif valor is not None:
        detalhes[CHAVE_VALOR_MANUAL] = str(valor)
        detalhes[CHAVE_FONTE] = "manual"
    if tipo == TipoReconciliacaoFiscalChoices.ICMS:
        if limpar or icms_entradas is None:
            detalhes.pop(CHAVE_ICMS_ENTRADAS_MANUAL, None)
        elif icms_entradas is not None:
            detalhes[CHAVE_ICMS_ENTRADAS_MANUAL] = str(icms_entradas)
        if limpar or icms_saidas is None:
            detalhes.pop(CHAVE_ICMS_SAIDAS_MANUAL, None)
        elif icms_saidas is not None:
            detalhes[CHAVE_ICMS_SAIDAS_MANUAL] = str(icms_saidas)
        if icms_entradas is not None or icms_saidas is not None:
            detalhes[CHAVE_FONTE] = "manual"
    rec.detalhes = detalhes
    rec.save(update_fields=["detalhes", "atualizado_em"])


def atualizar_contabilidade_manual(
    pacote: PacoteObrigacaoFiscal,
    tipo: str,
    *,
    valor: Decimal | None = None,
    icms_entradas: Decimal | None = None,
    icms_saidas: Decimal | None = None,
    limpar: bool = False,
) -> None:
    if tipo not in TIPOS_EDITAVEIS:
        raise ValueError(f"Tipo de conciliação não editável: {tipo}")
    if not limpar and contabilidade_bloqueada_por_pdf(pacote, tipo):
        raise ValueError("Valor definido pelo PDF importado. Reimporte um PDF pesquisável para alterar.")

    if limpar:
        _persistir_detalhes_manual(pacote, tipo, limpar=True)
        return

    if tipo == TipoReconciliacaoFiscalChoices.DAS_INSS:
        if valor is None or valor <= 0:
            raise ValueError("Informe o valor INSS (cód. 1006) do DAS.")
        das = garantir_obrigacao_das_editavel(pacote)
        if das is None:
            das = _obter_ou_criar_obrigacao(
                pacote,
                TipoObrigacaoFiscalChoices.DAS,
                descricao="DAS — Simples Nacional (informar manualmente)",
            )
        aplicar_linhas_composicao_obrigacao(
            das,
            [
                {
                    "codigo": CODIGO_INSS_DAS_SIMPLES,
                    "descricao": "INSS - SIMPLES NACIONAL",
                    "valor": str(valor),
                }
            ],
            fonte="manual",
        )
        _persistir_detalhes_manual(pacote, tipo, valor=valor)
        return

    if tipo == TipoReconciliacaoFiscalChoices.ICMS:
        snapshot, _ = SnapshotApuracaoIcms.objects.get_or_create(pacote=pacote, defaults={})
        entradas = icms_entradas
        saidas = icms_saidas
        if entradas is None:
            entradas = snapshot.valor_contabil_entradas or valor_icms_manual(pacote, "entradas")
        if saidas is None:
            saidas = snapshot.valor_contabil_saidas or valor_icms_manual(pacote, "saidas")
        if limpar:
            snapshot.valor_contabil_entradas = None
            snapshot.valor_contabil_saidas = None
            snapshot.save(update_fields=["valor_contabil_entradas", "valor_contabil_saidas", "atualizado_em"])
            _persistir_detalhes_manual(pacote, tipo, limpar=True)
            return
        if entradas is None or saidas is None:
            raise ValueError("Informe os valores contábeis de entradas e saídas da DIME.")
        snapshot.valor_contabil_entradas = entradas
        snapshot.valor_contabil_saidas = saidas
        snapshot.save(
            update_fields=["valor_contabil_entradas", "valor_contabil_saidas", "atualizado_em"]
        )
        _persistir_detalhes_manual(
            pacote,
            tipo,
            valor=saidas,
            icms_entradas=entradas,
            icms_saidas=saidas,
        )
        return

    if valor is None or valor <= 0:
        raise ValueError("Informe um valor válido para a contabilidade.")

    tipo_obrigacao = OBRIGACAO_POR_TIPO.get(tipo)
    if tipo_obrigacao:
        descricoes = {
            TipoObrigacaoFiscalChoices.DAS: "DAS — Simples Nacional (informar manualmente)",
            TipoObrigacaoFiscalChoices.INSS_DARF: "INSS — DARF (informar manualmente)",
            TipoObrigacaoFiscalChoices.FGTS: "FGTS (informar manualmente)",
            TipoObrigacaoFiscalChoices.ISS: "ISS (informar manualmente)",
        }
        obrigacao = _obter_ou_criar_obrigacao(
            pacote,
            tipo_obrigacao,
            descricao=descricoes[tipo_obrigacao],
        )
        obrigacao.valor = valor
        extra = dict(obrigacao.dados_extra or {})
        extra["fonte_valor"] = "manual"
        obrigacao.dados_extra = extra
        obrigacao.save(update_fields=["valor", "dados_extra", "atualizado_em"])

    _persistir_detalhes_manual(pacote, tipo, valor=valor)


def aplicar_contabilidade_manual_e_reconciliar(
    pacote: PacoteObrigacaoFiscal,
    tipo: str,
    **kwargs,
) -> ReconciliacaoFiscal:
    from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_pacote

    atualizar_contabilidade_manual(pacote, tipo, **kwargs)
    reconciliacoes = reconciliar_pacote(pacote)
    for rec in reconciliacoes:
        if rec.tipo == tipo:
            return rec
    return pacote.reconciliacoes.get(tipo=tipo)
