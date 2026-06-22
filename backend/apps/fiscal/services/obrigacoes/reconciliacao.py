"""Conciliação ERP × contabilidade (Fase 3)."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db import transaction

from apps.fiscal.choices import (
    StatusObrigacaoFiscalChoices,
    StatusReconciliacaoFiscalChoices,
    TipoObrigacaoFiscalChoices,
    TipoReconciliacaoFiscalChoices,
)
from apps.fiscal.models import DocumentoFiscalEmitido, DocumentoFiscalRecebido, PerfilTributarioSimples
from apps.fiscal.models_obrigacoes import PacoteObrigacaoFiscal, ReconciliacaoFiscal
from apps.fiscal.services.faturamento_simples import montar_projecao_das
from apps.fiscal.services.obrigacoes.darf_inss import (
    garantir_inss_darf_do_pdf,
    valor_darf_pdf,
    valor_parece_das_contaminado,
)
from apps.fiscal.services.obrigacoes.das_simples import (
    CODIGO_INSS_DAS_SIMPLES,
    das_importado_de_pdf,
    garantir_das_do_pdf,
    garantir_obrigacao_das_editavel,
    valor_das_pdf_simples,
    valor_linha_composicao_das,
)
from apps.fiscal.services.obrigacoes.contabilidade_manual import (
    CHAVE_FONTE,
    CHAVE_ICMS_ENTRADAS_MANUAL,
    CHAVE_ICMS_SAIDAS_MANUAL,
    CHAVE_VALOR_MANUAL,
    resolver_valor_contabil,
    resolver_valor_icms,
    valor_contabil_manual,
)
from apps.fiscal.services.obrigacoes.holerites_rh import holerites_para_conciliacao
from apps.fiscal.services.obrigacoes.importar_pacote import reprocessar_anexos_pacote

TOLERANCIA_VALOR = Decimal("1.00")
TOLERANCIA_PERCENTUAL = Decimal("2.0")
CHAVES_DETALHES_MANUAL = frozenset(
    {
        CHAVE_VALOR_MANUAL,
        CHAVE_FONTE,
        CHAVE_ICMS_ENTRADAS_MANUAL,
        CHAVE_ICMS_SAIDAS_MANUAL,
    }
)


def _status_diff(interno: Decimal | None, contab: Decimal | None) -> tuple[str, Decimal | None, Decimal | None]:
    if interno is None or contab is None:
        return StatusReconciliacaoFiscalChoices.PENDENTE, None, None
    diff = contab - interno
    pct = None
    if interno != 0:
        pct = (diff / interno * Decimal("100")).quantize(Decimal("0.0001"))
    abs_diff = abs(diff)
    if abs_diff <= TOLERANCIA_VALOR:
        return StatusReconciliacaoFiscalChoices.OK, diff, pct
    if pct is not None and abs(pct) <= TOLERANCIA_PERCENTUAL:
        return StatusReconciliacaoFiscalChoices.ALERTA, diff, pct
    if abs_diff <= Decimal("10"):
        return StatusReconciliacaoFiscalChoices.ALERTA, diff, pct
    return StatusReconciliacaoFiscalChoices.ERRO, diff, pct


def _salvar_reconciliacao(
    pacote: PacoteObrigacaoFiscal,
    tipo: str,
    *,
    valor_interno: Decimal | None,
    valor_contabilidade: Decimal | None,
    mensagem: str,
    detalhes: dict | None = None,
) -> ReconciliacaoFiscal:
    status, diff, pct = _status_diff(valor_interno, valor_contabilidade)
    rec_existente = pacote.reconciliacoes.filter(tipo=tipo).first()
    detalhes_finais = dict(detalhes or {})
    if rec_existente:
        for chave in CHAVES_DETALHES_MANUAL:
            if chave in (rec_existente.detalhes or {}) and chave not in detalhes_finais:
                detalhes_finais[chave] = rec_existente.detalhes[chave]
    rec, _ = ReconciliacaoFiscal.objects.update_or_create(
        pacote=pacote,
        tipo=tipo,
        defaults={
            "valor_interno": valor_interno,
            "valor_contabilidade": valor_contabilidade,
            "diferenca": diff,
            "diferenca_percentual": pct,
            "status": status,
            "mensagem": mensagem,
            "detalhes": detalhes_finais,
        },
    )
    return rec


def _competencia_bounds(competencia: str) -> tuple[date, date]:
    ano, mes = int(competencia[:4]), int(competencia[5:7])
    from calendar import monthrange

    ultimo = monthrange(ano, mes)[1]
    return date(ano, mes, 1), date(ano, mes, ultimo)


def reconciliar_das(pacote: PacoteObrigacaoFiscal) -> ReconciliacaoFiscal:
    garantir_das_do_pdf(pacote)
    garantir_obrigacao_das_editavel(pacote)
    obrigacao = pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.DAS).first()
    valor_contab, anexo_simples = valor_das_pdf_simples(pacote)
    if valor_contab is None and obrigacao and obrigacao.valor > 0 and not das_importado_de_pdf(pacote):
        valor_contab = obrigacao.valor
    valor_contab = resolver_valor_contabil(
        pacote,
        TipoReconciliacaoFiscalChoices.DAS,
        valor_contab if das_importado_de_pdf(pacote) else None,
    ) or valor_contab
    perfil, _ = PerfilTributarioSimples.objects.get_or_create(cnpj=pacote.cnpj)
    try:
        projecao = montar_projecao_das(
            cnpj=pacote.cnpj,
            perfil=perfil,
            competencia=pacote.competencia,
        )
        valor_interno = Decimal(str(projecao["das_estimado_total"]))
        if obrigacao:
            obrigacao.valor_estimado = valor_interno
            obrigacao.save(update_fields=["valor_estimado", "atualizado_em"])
    except (ValueError, TypeError) as exc:
        return _salvar_reconciliacao(
            pacote,
            TipoReconciliacaoFiscalChoices.DAS,
            valor_interno=None,
            valor_contabilidade=valor_contab,
            mensagem=f"Não foi possível calcular projeção DAS: {exc}",
        )
    return _salvar_reconciliacao(
        pacote,
        TipoReconciliacaoFiscalChoices.DAS,
        valor_interno=valor_interno,
        valor_contabilidade=valor_contab,
        mensagem=(
            "Comparação DAS estimado (NF-es emitidas) × valor do PDF Simples Nacional importado."
            if valor_contab is not None
            else "Importe o PDF do DAS (Simples Nacional) para informar valor e composição."
        ),
        detalhes={
            "receita_competencia": projecao.get("receita_competencia"),
            "anexo_simples_id": str(anexo_simples.public_id) if anexo_simples else None,
            "anexo_simples_nome": anexo_simples.nome_original if anexo_simples else None,
        },
    )


def _soma_inss_holerites(pacote: PacoteObrigacaoFiscal) -> tuple[Decimal, list]:
    holerites = holerites_para_conciliacao(pacote)
    total = sum((h.desconto_inss for h in holerites), Decimal("0"))
    return total, holerites


def reconciliar_das_inss_holerites(pacote: PacoteObrigacaoFiscal) -> ReconciliacaoFiscal:
    """Cruza INSS da composição do DAS (cód. 1006) × soma INSS dos holerites vinculados ao RH."""
    garantir_das_do_pdf(pacote)
    garantir_obrigacao_das_editavel(pacote)
    valor_contab_pdf = valor_linha_composicao_das(pacote, CODIGO_INSS_DAS_SIMPLES)
    valor_contab = valor_contab_pdf or valor_contabil_manual(
        pacote,
        TipoReconciliacaoFiscalChoices.DAS_INSS,
    )
    anexo = pacote.anexos.filter(tipo_arquivo="SIMPLES").order_by("-criado_em").first()
    total_inss, holerites = _soma_inss_holerites(pacote)
    valor_interno = total_inss or None

    if valor_contab is None:
        return _salvar_reconciliacao(
            pacote,
            TipoReconciliacaoFiscalChoices.DAS_INSS,
            valor_interno=valor_interno,
            valor_contabilidade=None,
            mensagem="Importe o DAS (Simples Nacional) com composição para comparar o código 1006 INSS.",
            detalhes={
                "codigo_das": CODIGO_INSS_DAS_SIMPLES,
                "holerites_validos": len(holerites),
                "holerites_total": pacote.holerites.count(),
            },
        )

    if not holerites:
        return _salvar_reconciliacao(
            pacote,
            TipoReconciliacaoFiscalChoices.DAS_INSS,
            valor_interno=None,
            valor_contabilidade=valor_contab,
            mensagem="Vincule os holerites ao RH para comparar INSS × linha 1006 do DAS.",
            detalhes={
                "codigo_das": CODIGO_INSS_DAS_SIMPLES,
                "holerites_validos": 0,
                "holerites_total": pacote.holerites.count(),
            },
        )

    holerites_detalhe = [
        {
            "holerite_id": h.id,
            "nome": h.nome,
            "colaborador": h.colaborador.nome if h.colaborador_id else "",
            "inss": str(h.desconto_inss),
        }
        for h in holerites
    ]

    return _salvar_reconciliacao(
        pacote,
        TipoReconciliacaoFiscalChoices.DAS_INSS,
        valor_interno=valor_interno,
        valor_contabilidade=valor_contab,
        mensagem="INSS composição DAS (cód. 1006) × soma INSS descontado nos holerites vinculados ao RH. "
        "O valor da contabilidade inclui parcela patronal do Simples — divergência grande é esperada.",
        detalhes={
            "codigo_das": CODIGO_INSS_DAS_SIMPLES,
            "holerites_validos": len(holerites),
            "holerites_total": pacote.holerites.count(),
            "holerites": holerites_detalhe,
        },
    )


def reconciliar_inss(pacote: PacoteObrigacaoFiscal) -> ReconciliacaoFiscal:
    garantir_inss_darf_do_pdf(pacote)
    obrigacao = pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.INSS_DARF).first()
    valor_contab, anexo_darf = valor_darf_pdf(pacote)
    if valor_contab is None and obrigacao and obrigacao.valor > 0:
        extra = obrigacao.dados_extra or {}
        if extra.get("valor_das_removido"):
            pass
        elif extra.get("fonte_valor") in {"manual", "pdf_darf"}:
            valor_contab = obrigacao.valor
        elif not extra.get("fonte_valor"):
            if not valor_parece_das_contaminado(
                pacote,
                {"valor": str(obrigacao.valor), "linhas_composicao": []},
            ):
                valor_contab = obrigacao.valor
    valor_contab = resolver_valor_contabil(
        pacote,
        TipoReconciliacaoFiscalChoices.INSS,
        valor_darf_pdf(pacote)[0],
    ) or valor_contab
    total_inss, holerites = _soma_inss_holerites(pacote)
    valor_interno = total_inss or None

    if obrigacao and valor_interno:
        obrigacao.valor_estimado = valor_interno
        obrigacao.save(update_fields=["valor_estimado", "atualizado_em"])

    holerites_detalhe = [
        {
            "holerite_id": h.id,
            "nome": h.nome,
            "colaborador": h.colaborador.nome if h.colaborador_id else "",
            "inss": str(h.desconto_inss),
        }
        for h in holerites
    ]
    detalhes = {
        "holerites_total": pacote.holerites.count(),
        "holerites_validos": len(holerites),
        "holerites": holerites_detalhe,
        "obrigacao_darf_id": str(obrigacao.public_id) if obrigacao else None,
        "anexo_darf": anexo_darf.nome_original if anexo_darf else None,
    }

    if valor_contab is None:
        mensagem = (
            "Importe o PDF da guia DARF INSS (Documento de Arrecadação de Receitas Federais) "
            "para comparar com a soma INSS dos holerites."
        )
        if not holerites:
            mensagem = (
                "Vincule os holerites ao RH e importe a guia DARF INSS para esta conciliação."
            )
        return _salvar_reconciliacao(
            pacote,
            TipoReconciliacaoFiscalChoices.INSS,
            valor_interno=valor_interno,
            valor_contabilidade=None,
            mensagem=mensagem,
            detalhes=detalhes,
        )

    return _salvar_reconciliacao(
        pacote,
        TipoReconciliacaoFiscalChoices.INSS,
        valor_interno=valor_interno,
        valor_contabilidade=valor_contab,
        mensagem=(
            "Soma INSS descontado nos holerites (parte do empregado) × total da guia DARF INSS. "
            "Não confundir com o código 1006 do DAS Simples Nacional."
        ),
        detalhes=detalhes,
    )


def reconciliar_fgts(pacote: PacoteObrigacaoFiscal) -> ReconciliacaoFiscal:
    obrigacao = pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.FGTS).first()
    valor_contab = obrigacao.valor if obrigacao and obrigacao.valor > 0 else None
    if valor_contab is None:
        valor_contab = valor_contabil_manual(pacote, TipoReconciliacaoFiscalChoices.FGTS)
    holerites = holerites_para_conciliacao(pacote)
    valor_interno = sum((h.fgts_mes for h in holerites), Decimal("0"))
    if obrigacao and valor_interno:
        obrigacao.valor_estimado = valor_interno
        obrigacao.save(update_fields=["valor_estimado", "atualizado_em"])
    return _salvar_reconciliacao(
        pacote,
        TipoReconciliacaoFiscalChoices.FGTS,
        valor_interno=valor_interno or None,
        valor_contabilidade=valor_contab,
        mensagem="Soma FGTS dos holerites vinculados ao RH × guia FGTS Digital.",
        detalhes={
            "holerites_total": pacote.holerites.count(),
            "holerites_validos": len(holerites),
        },
    )


def reconciliar_iss(pacote: PacoteObrigacaoFiscal) -> ReconciliacaoFiscal:
    obrigacao = pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.ISS).first()
    valor_contab = obrigacao.valor if obrigacao and obrigacao.valor > 0 else None
    if valor_contab is None:
        valor_contab = valor_contabil_manual(pacote, TipoReconciliacaoFiscalChoices.ISS)
    valor_interno = None
    detalhes: dict = {}
    if obrigacao and obrigacao.documento_fiscal_emitido_id:
        nfse = obrigacao.documento_fiscal_emitido
        valor_interno = nfse.valor_total
        detalhes = {"numero_nfse": nfse.numero, "public_id": str(nfse.public_id)}
    elif obrigacao:
        numero = (obrigacao.dados_extra or {}).get("numero_nfse")
        if numero:
            nfse = DocumentoFiscalEmitido.objects.filter(numero=numero).first()
            if nfse:
                valor_interno = nfse.valor_total
                detalhes = {"numero_nfse": numero, "vinculo": "por_numero"}
    if obrigacao and valor_interno is not None:
        obrigacao.valor_estimado = valor_interno
        obrigacao.save(update_fields=["valor_estimado", "atualizado_em"])
    return _salvar_reconciliacao(
        pacote,
        TipoReconciliacaoFiscalChoices.ISS,
        valor_interno=valor_interno,
        valor_contabilidade=valor_contab,
        mensagem="Valor NFS-e emitida × guia ISS municipal.",
        detalhes=detalhes,
    )


def reconciliar_icms(pacote: PacoteObrigacaoFiscal) -> ReconciliacaoFiscal:
    snapshot = getattr(pacote, "snapshot_icms", None)
    inicio, fim = _competencia_bounds(pacote.competencia)
    entradas = DocumentoFiscalRecebido.objects.filter(
        cnpj_destinatario=pacote.cnpj,
        data_emissao__date__gte=inicio,
        data_emissao__date__lte=fim,
    )
    saidas = DocumentoFiscalEmitido.objects.filter(
        cnpj_emitente=pacote.cnpj,
        data_emissao__date__gte=inicio,
        data_emissao__date__lte=fim,
    )
    valor_entradas = sum((d.valor_total or Decimal("0") for d in entradas), Decimal("0"))
    valor_saidas = sum((d.valor_total or Decimal("0") for d in saidas), Decimal("0"))
    valor_contab_ent_pdf = snapshot.valor_contabil_entradas if snapshot else None
    valor_contab_sai_pdf = snapshot.valor_contabil_saidas if snapshot else None
    valor_contab_ent = resolver_valor_icms(pacote, "entradas", valor_contab_ent_pdf)
    valor_contab_sai = resolver_valor_icms(pacote, "saidas", valor_contab_sai_pdf)
    diff_ent = None
    diff_sai = None
    if valor_contab_ent is not None:
        diff_ent = valor_contab_ent - valor_entradas
    if valor_contab_sai is not None:
        diff_sai = valor_contab_sai - valor_saidas

    dime_completa = valor_contab_ent is not None and valor_contab_sai is not None

    if not dime_completa:
        status = StatusReconciliacaoFiscalChoices.PENDENTE
        if snapshot is None and valor_contab_ent is None and valor_contab_sai is None:
            mensagem = "Importe a DIME ICMS para conciliação completa."
        else:
            mensagem = (
                "Informe os valores contábeis de entradas e saídas da DIME "
                "(PDF ilegível ou valores não extraídos)."
            )
    else:
        status = StatusReconciliacaoFiscalChoices.OK
        mensagem = "Movimento NF-e × DIME (valor contábil entradas/saídas)."
        if diff_ent is not None and abs(diff_ent) > Decimal("500"):
            status = StatusReconciliacaoFiscalChoices.ALERTA
            mensagem += f" Entradas: diff R$ {diff_ent}."
        if diff_sai is not None and abs(diff_sai) > Decimal("500"):
            status = StatusReconciliacaoFiscalChoices.ALERTA
            mensagem += f" Saídas: diff R$ {diff_sai}."

    detalhes_icms = {
        "nf_entradas_total": str(valor_entradas),
        "nf_saidas_total": str(valor_saidas),
        "dime_entradas": str(valor_contab_ent) if valor_contab_ent is not None else None,
        "dime_saidas": str(valor_contab_sai) if valor_contab_sai is not None else None,
        "saldo_credor_dime": str(snapshot.saldo_credor) if snapshot and snapshot.saldo_credor else None,
        "dime_importada": snapshot is not None,
    }
    rec_existente = pacote.reconciliacoes.filter(tipo=TipoReconciliacaoFiscalChoices.ICMS).first()
    if rec_existente:
        for chave in CHAVES_DETALHES_MANUAL:
            if chave in (rec_existente.detalhes or {}):
                detalhes_icms[chave] = rec_existente.detalhes[chave]

    rec, _ = ReconciliacaoFiscal.objects.update_or_create(
        pacote=pacote,
        tipo=TipoReconciliacaoFiscalChoices.ICMS,
        defaults={
            "valor_interno": valor_saidas,
            "valor_contabilidade": valor_contab_sai,
            "diferenca": diff_sai,
            "status": status,
            "mensagem": mensagem,
            "detalhes": detalhes_icms,
        },
    )
    return rec


def reconciliar_pacote(pacote: PacoteObrigacaoFiscal) -> list[ReconciliacaoFiscal]:
    resultados = [
        reconciliar_das(pacote),
        reconciliar_das_inss_holerites(pacote),
        reconciliar_inss(pacote),
        reconciliar_fgts(pacote),
        reconciliar_iss(pacote),
        reconciliar_icms(pacote),
    ]
    pendentes = pacote.obrigacoes.filter(status=StatusObrigacaoFiscalChoices.PENDENTE).count()
    pagas = pacote.obrigacoes.filter(status=StatusObrigacaoFiscalChoices.PAGO).count()
    _salvar_reconciliacao(
        pacote,
        TipoReconciliacaoFiscalChoices.PACOTE,
        valor_interno=Decimal(pagas),
        valor_contabilidade=Decimal(pacote.obrigacoes.count()),
        mensagem=f"Obrigações pagas {pagas} de {pacote.obrigacoes.count()}; pendentes {pendentes}.",
        detalhes={"pacote_completo": pacote.pacote_completo},
    )
    return resultados


@transaction.atomic
def executar_reconciliacao_pacote(pacote: PacoteObrigacaoFiscal) -> list[ReconciliacaoFiscal]:
    reprocessar_anexos_pacote(pacote)
    return reconciliar_pacote(pacote)
