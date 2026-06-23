"""Importação de PDFs e montagem do pacote mensal de obrigações."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.fiscal.choices import (
    StatusObrigacaoFiscalChoices,
    TipoAnexoObrigacaoFiscalChoices,
    TipoHoleriteFiscalChoices,
    TipoObrigacaoFiscalChoices,
)
from apps.fiscal.models import DocumentoFiscalEmitido, PerfilTributarioSimples
from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    HoleriteCompetencia,
    LinhaComposicaoObrigacao,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
    SnapshotApuracaoIcms,
)
from apps.fiscal.services.obrigacoes.darf_inss import garantir_inss_darf_do_pdf
from apps.fiscal.services.obrigacoes.das_simples import garantir_das_do_pdf, garantir_obrigacao_das_editavel
from apps.fiscal.services.obrigacoes.holerites_rh import holerites_para_conciliacao, importar_holerite_item
from apps.fiscal.services.obrigacoes.parse_pdf import parse_pdf_obrigacao
from apps.fiscal.services.obrigacoes.pdf_util import eh_documento_simples_nacional
from apps.fiscal.utils import normalizar_cnpj

TIPOS_ESPERADOS = {
    TipoAnexoObrigacaoFiscalChoices.DARF,
    TipoAnexoObrigacaoFiscalChoices.FGTS,
    TipoAnexoObrigacaoFiscalChoices.ISS,
    TipoAnexoObrigacaoFiscalChoices.DIME_ICMS,
    TipoAnexoObrigacaoFiscalChoices.SIMPLES,
    TipoAnexoObrigacaoFiscalChoices.HOLERITE,
}


def obter_ou_criar_pacote(*, cnpj: str, competencia: str) -> PacoteObrigacaoFiscal:
    cnpj_norm = normalizar_cnpj(cnpj)
    pacote, created = PacoteObrigacaoFiscal.objects.get_or_create(
        cnpj=cnpj_norm,
        competencia=competencia,
        defaults={"recebido_em": timezone.localdate()},
    )
    if not created and pacote.recebido_em is None:
        pacote.recebido_em = timezone.localdate()
        pacote.save(update_fields=["recebido_em", "atualizado_em"])
    return pacote


def _atualizar_status_vencidas(pacote: PacoteObrigacaoFiscal) -> None:
    hoje = timezone.localdate()
    pacote.obrigacoes.filter(
        status=StatusObrigacaoFiscalChoices.PENDENTE,
        data_vencimento__lt=hoje,
    ).update(status=StatusObrigacaoFiscalChoices.VENCIDO)


def _vincular_nfse_iss(obrigacao: ObrigacaoFiscal, dados_extra: dict) -> None:
    numero = (dados_extra or {}).get("numero_nfse") or ""
    if not numero:
        return
    nfse = (
        DocumentoFiscalEmitido.objects.filter(numero=numero)
        .order_by("-data_emissao")
        .first()
    )
    if nfse:
        obrigacao.documento_fiscal_emitido = nfse
        obrigacao.save(update_fields=["documento_fiscal_emitido", "atualizado_em"])


def _criar_ou_atualizar_obrigacao(
    pacote: PacoteObrigacaoFiscal,
    parsed: dict,
) -> ObrigacaoFiscal | None:
    tipo_obrigacao = parsed.get("tipo_obrigacao")
    if not tipo_obrigacao:
        return None

    valor = Decimal(str(parsed.get("valor") or "0"))
    if valor <= 0 and not parsed.get("sucesso"):
        return pacote.obrigacoes.filter(tipo=tipo_obrigacao).first()

    venc_str = parsed.get("data_vencimento")
    vencimento = date.fromisoformat(venc_str) if venc_str else None

    obrigacao, _ = ObrigacaoFiscal.objects.update_or_create(
        pacote=pacote,
        tipo=tipo_obrigacao,
        defaults={
            "descricao": parsed.get("descricao") or "",
            "valor": valor,
            "data_vencimento": vencimento,
            "numero_documento": parsed.get("numero_documento") or "",
            "dados_extra": {
                **(parsed.get("dados_extra") or {}),
                "importado_de_anexo": parsed.get("tipo_anexo") or "",
                "parse_sucesso": bool(parsed.get("sucesso")),
            },
            "status": StatusObrigacaoFiscalChoices.PENDENTE,
        },
    )

    _aplicar_linhas_composicao(obrigacao, parsed)
    _persistir_snapshot_icms(pacote, parsed.get("snapshot_icms"))
    _vincular_nfse_iss(obrigacao, parsed.get("dados_extra") or {})
    return obrigacao


def _aplicar_linhas_composicao(obrigacao: ObrigacaoFiscal, parsed: dict) -> None:
    obrigacao.linhas_composicao.all().delete()
    for linha in parsed.get("linhas_composicao") or []:
        LinhaComposicaoObrigacao.objects.create(
            obrigacao=obrigacao,
            codigo=linha.get("codigo") or "",
            descricao=linha.get("descricao") or "",
            valor=Decimal(str(linha.get("valor") or "0")),
        )


def _persistir_snapshot_icms(pacote: PacoteObrigacaoFiscal, snapshot: dict | None) -> None:
    if not snapshot:
        return
    SnapshotApuracaoIcms.objects.update_or_create(
        pacote=pacote,
        defaults={
            "saldo_credor_anterior": _dec(snapshot.get("saldo_credor_anterior")),
            "debitos_saidas": _dec(snapshot.get("debitos_saidas")),
            "creditos_entradas": _dec(snapshot.get("creditos_entradas")),
            "total_debitos": _dec(snapshot.get("total_debitos")),
            "total_creditos": _dec(snapshot.get("total_creditos")),
            "saldo_credor": _dec(snapshot.get("saldo_credor")),
            "imposto_a_recolher": _dec(snapshot.get("imposto_a_recolher")),
            "valor_contabil_entradas": _dec(snapshot.get("valor_contabil_entradas")),
            "valor_contabil_saidas": _dec(snapshot.get("valor_contabil_saidas")),
            "dados_quadros": snapshot,
        },
    )


def _dec(valor) -> Decimal | None:
    if valor is None or valor == "":
        return None
    return Decimal(str(valor))


def _importar_holerites(pacote: PacoteObrigacaoFiscal, holerites: list[dict]) -> dict:
    pacote.holerites.all().delete()
    resumo: list[dict] = []
    vinculados = 0
    pendentes = 0
    for item in holerites:
        _, info = importar_holerite_item(pacote, item)
        resumo.append(info)
        if info["status"] == "VINCULADO":
            vinculados += 1
        else:
            pendentes += 1
    return {
        "total": len(holerites),
        "vinculados": vinculados,
        "pendentes": pendentes,
        "itens": resumo,
    }


def _atualizar_folha_perfil_simples(pacote: PacoteObrigacaoFiscal) -> None:
    """Atualiza folha acumulada no perfil Simples a partir dos holerites importados."""
    holerites = holerites_para_conciliacao(pacote)
    if not holerites:
        return
    folha_mes = sum((h.proventos for h in holerites), Decimal("0"))
    encargos_mes = sum((h.desconto_inss + h.fgts_mes for h in holerites), Decimal("0"))
    perfil, _ = PerfilTributarioSimples.objects.get_or_create(cnpj=pacote.cnpj)
    # Acumula estimativa rolling 12m simplificada: soma holerites importados ao perfil existente
    perfil.folha_salarios_12m = max(perfil.folha_salarios_12m, folha_mes)
    perfil.encargos_folha_12m = max(perfil.encargos_folha_12m, encargos_mes)
    perfil.save(update_fields=["folha_salarios_12m", "encargos_folha_12m", "atualizado_em"])


def _marcar_pacote_completo(pacote: PacoteObrigacaoFiscal) -> None:
    tipos_anexo = set(pacote.anexos.values_list("tipo_arquivo", flat=True))
    pacote.pacote_completo = TIPOS_ESPERADOS.issubset(tipos_anexo)
    pacote.save(update_fields=["pacote_completo", "atualizado_em"])


def _aplicar_parse_anexo(
    pacote: PacoteObrigacaoFiscal,
    anexo: AnexoObrigacaoFiscal,
    parsed: dict,
) -> ObrigacaoFiscal | None:
    tipo_anexo = parsed.get("tipo_anexo") or TipoAnexoObrigacaoFiscalChoices.OUTRO
    anexo.tipo_arquivo = tipo_anexo
    anexo.parsed_data = parsed
    anexo.parse_sucesso = bool(parsed.get("sucesso"))
    anexo.parse_erros = "; ".join(parsed.get("erros") or [])

    obrigacao = None
    if eh_documento_simples_nacional(anexo.nome_original, parsed.get("texto_preview") or "", parsed):
        obrigacao = garantir_das_do_pdf(pacote)
        anexo.refresh_from_db()
    elif parsed.get("tipo_obrigacao"):
        obrigacao = _criar_ou_atualizar_obrigacao(pacote, parsed)
        if obrigacao:
            anexo.obrigacao = obrigacao

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


@transaction.atomic
def reprocessar_anexos_pacote(pacote: PacoteObrigacaoFiscal) -> None:
    """Reexecuta parse dos PDFs anexados (corrige classificação DARF × Simples etc.)."""
    for anexo in pacote.anexos.exclude(arquivo=""):
        if not anexo.arquivo:
            continue
        with anexo.arquivo.open("rb") as handle:
            conteudo = handle.read()
        parsed = parse_pdf_obrigacao(
            arquivo_bytes=conteudo,
            nome_arquivo=anexo.nome_original,
        )
        if parsed.get("competencia") and parsed["competencia"] != pacote.competencia:
            parsed.setdefault("erros", []).append(
                f"Competência do PDF ({parsed['competencia']}) difere do pacote ({pacote.competencia})."
            )
        _aplicar_parse_anexo(pacote, anexo, parsed)
    garantir_das_do_pdf(pacote)
    garantir_inss_darf_do_pdf(pacote)
    garantir_obrigacao_das_editavel(pacote)
    _marcar_pacote_completo(pacote)


@transaction.atomic
def importar_anexo_pdf(
    *,
    pacote: PacoteObrigacaoFiscal,
    arquivo,
    nome_original: str,
    tipo_forcado: str | None = None,
) -> dict:
    conteudo = arquivo.read()
    parsed = parse_pdf_obrigacao(
        arquivo_bytes=conteudo,
        nome_arquivo=nome_original,
        tipo_forcado=tipo_forcado,
    )
    tipo_anexo = parsed.get("tipo_anexo") or TipoAnexoObrigacaoFiscalChoices.OUTRO
    if parsed.get("competencia") and parsed["competencia"] != pacote.competencia:
        parsed.setdefault("erros", []).append(
            f"Competência do PDF ({parsed['competencia']}) difere do pacote ({pacote.competencia})."
        )

    arquivo.seek(0)
    anexo = AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=tipo_anexo,
        arquivo=arquivo,
        nome_original=nome_original,
        parsed_data=parsed,
        parse_sucesso=bool(parsed.get("sucesso")),
        parse_erros="; ".join(parsed.get("erros") or []),
    )

    obrigacao = None
    if eh_documento_simples_nacional(nome_original, parsed.get("texto_preview") or "", parsed):
        obrigacao = garantir_das_do_pdf(pacote) or garantir_obrigacao_das_editavel(pacote)
        anexo.refresh_from_db()
        parsed = anexo.parsed_data or parsed
    elif parsed.get("tipo_obrigacao"):
        obrigacao = _criar_ou_atualizar_obrigacao(pacote, parsed)
        if obrigacao:
            anexo.obrigacao = obrigacao
            anexo.save(update_fields=["obrigacao"])

    if parsed.get("holerites"):
        resumo_holerites = _importar_holerites(pacote, parsed["holerites"])
        _atualizar_folha_perfil_simples(pacote)
        parsed["holerites_importados"] = resumo_holerites["total"]
        parsed["holerites_resumo"] = resumo_holerites
        if resumo_holerites["pendentes"]:
            parsed.setdefault("erros", []).append(
                f"{resumo_holerites['pendentes']} holerite(s) aguardando vínculo com colaborador do RH."
            )

    _marcar_pacote_completo(pacote)
    _atualizar_status_vencidas(pacote)

    return {
        "anexo_id": str(anexo.public_id),
        "parse": parsed,
        "obrigacao_id": str(obrigacao.public_id) if obrigacao else None,
    }


def marcar_obrigacao_paga(
    *,
    obrigacao: ObrigacaoFiscal,
    data_pagamento: date | None = None,
    criar_lancamento_financeiro: bool = True,
    conta: str = "Impostos",
    centro_custo: str = "Administrativo",
) -> ObrigacaoFiscal:
    from apps.fiscal.services.obrigacoes.lancamento_financeiro import registrar_pagamento_obrigacao

    obrigacao.status = StatusObrigacaoFiscalChoices.PAGO
    obrigacao.data_pagamento = data_pagamento or timezone.localdate()
    obrigacao.save(update_fields=["status", "data_pagamento", "atualizado_em"])
    if criar_lancamento_financeiro:
        registrar_pagamento_obrigacao(
            obrigacao=obrigacao,
            conta=conta,
            centro_custo=centro_custo,
        )
    return obrigacao


def excluir_anexo_obrigacao(anexo: AnexoObrigacaoFiscal) -> None:
    if anexo.arquivo:
        anexo.arquivo.delete(save=False)
    anexo.delete()


@transaction.atomic
def excluir_todos_anexos_pacote(pacote: PacoteObrigacaoFiscal) -> int:
    anexos = list(pacote.anexos.all())
    for anexo in anexos:
        excluir_anexo_obrigacao(anexo)
    if anexos:
        pacote.pacote_completo = False
        pacote.save(update_fields=["pacote_completo", "atualizado_em"])
    return len(anexos)
