from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)

from .alimentacao_geral import dimensionar_circuito_alimentacao_geral
from .dimensionar import dimensionar_circuito_para_carga
from .revisao_condutores import sincronizar_flag_revisao_condutores


def _qmm(v) -> Decimal | None:
    if v is None:
        return None
    return Decimal(str(v)).quantize(Decimal("0.01"))


def _fp_circuito_de_dados(dados: dict) -> tuple:
    return (
        _qmm(dados.get("corrente_projeto_a")),
        _qmm(dados.get("secao_condutor_fase_mm2")),
        _qmm(dados.get("secao_condutor_neutro_mm2")),
        _qmm(dados.get("secao_condutor_pe_mm2")),
    )


def _fp_circuito_de_obj(obj: DimensionamentoCircuitoCarga) -> tuple:
    return (
        _qmm(obj.corrente_projeto_a),
        _qmm(obj.secao_condutor_fase_mm2),
        _qmm(obj.secao_condutor_neutro_mm2),
        _qmm(obj.secao_condutor_pe_mm2),
    )


def _fp_ag_de_dados(dados_ag: dict) -> tuple:
    return (
        _qmm(dados_ag.get("corrente_total_painel_a")),
        _qmm(dados_ag.get("secao_condutor_fase_mm2")),
        _qmm(dados_ag.get("secao_condutor_neutro_mm2")),
        _qmm(dados_ag.get("secao_condutor_pe_mm2")),
    )


def _fp_ag_de_obj(obj: DimensionamentoCircuitoAlimentacaoGeral) -> tuple:
    return (
        _qmm(obj.corrente_total_painel_a),
        _qmm(obj.secao_condutor_fase_mm2),
        _qmm(obj.secao_condutor_neutro_mm2),
        _qmm(obj.secao_condutor_pe_mm2),
    )


def calcular_e_salvar_circuitos_cargas(projeto, resumo=None) -> int:
    """
    Percorre as cargas ativas do projeto, recalcula e persiste
    `DimensionamentoCircuitoCarga` (substitui registros anteriores do projeto).
    Atualiza também `DimensionamentoCircuitoAlimentacaoGeral` com base em
    `resumo.corrente_total_painel_a` e parâmetros do projeto.

    `resumo` deve ser o registro já salvo com `corrente_total_painel_a` atualizada;
    se omitido, carrega de `ResumoDimensionamento`.
    Retorna quantidade de circuitos de carga gravados.

    Quando o dimensionamento sugerido (correntes e seções normativas) de uma carga
    não muda face ao recálculo anterior, preserva-se `condutores_aprovado` e as
    bitolas escolhidas pelo utilizador. O mesmo vale para a alimentação geral.
    """
    cargas = (
        projeto.cargas.filter(ativo=True)
        .select_related(
            "motor",
            "resistencia",
            "valvula",
            "sensor",
            "transdutor",
        )
        .order_by("tag")
    )

    with transaction.atomic():
        old_snaps: dict = {}
        for o in DimensionamentoCircuitoCarga.objects.filter(projeto=projeto):
            old_snaps[o.carga_id] = {
                "fp": _fp_circuito_de_obj(o),
                "aprovado": o.condutores_aprovado,
                "fase_e": o.secao_condutor_fase_escolhida_mm2,
                "neutro_e": o.secao_condutor_neutro_escolhida_mm2,
                "pe_e": o.secao_condutor_pe_escolhida_mm2,
            }

        old_ag = DimensionamentoCircuitoAlimentacaoGeral.objects.filter(
            projeto=projeto
        ).first()
        old_ag_fp = _fp_ag_de_obj(old_ag) if old_ag else None
        old_ag_aprov = bool(old_ag.condutores_aprovado) if old_ag else False
        old_ag_esc = (
            old_ag.secao_condutor_fase_escolhida_mm2,
            old_ag.secao_condutor_neutro_escolhida_mm2,
            old_ag.secao_condutor_pe_escolhida_mm2,
        ) if old_ag else (None, None, None)

        DimensionamentoCircuitoCarga.objects.filter(projeto=projeto).delete()

        n = 0
        agora = timezone.now()
        for carga in cargas:
            dados = dimensionar_circuito_para_carga(carga, projeto)
            if not dados:
                continue
            snap = old_snaps.get(carga.pk)
            fp_novo = _fp_circuito_de_dados(dados)
            obj = DimensionamentoCircuitoCarga(
                projeto=projeto,
                carga=carga,
                **dados,
            )
            if (
                snap
                and snap["aprovado"]
                and snap["fp"] == fp_novo
            ):
                obj.condutores_aprovado = True
                obj.secao_condutor_fase_escolhida_mm2 = snap["fase_e"]
                obj.secao_condutor_neutro_escolhida_mm2 = snap["neutro_e"]
                obj.secao_condutor_pe_escolhida_mm2 = snap["pe_e"]
            obj.save()
            n += 1

        if resumo is None:
            resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)

        dados_ag = dimensionar_circuito_alimentacao_geral(projeto, resumo)
        DimensionamentoCircuitoAlimentacaoGeral.objects.update_or_create(
            projeto=projeto,
            defaults=dados_ag,
        )
        ag = DimensionamentoCircuitoAlimentacaoGeral.objects.get(projeto=projeto)
        fp_ag_novo = _fp_ag_de_dados(dados_ag)

        if (
            old_ag_fp is not None
            and old_ag_fp == fp_ag_novo
            and old_ag_aprov
        ):
            ag.condutores_aprovado = True
            ag.secao_condutor_fase_escolhida_mm2 = old_ag_esc[0]
            ag.secao_condutor_neutro_escolhida_mm2 = old_ag_esc[1]
            ag.secao_condutor_pe_escolhida_mm2 = old_ag_esc[2]
            ag.atualizado_em = agora
            ag.save(
                update_fields=[
                    "condutores_aprovado",
                    "secao_condutor_fase_escolhida_mm2",
                    "secao_condutor_neutro_escolhida_mm2",
                    "secao_condutor_pe_escolhida_mm2",
                    "atualizado_em",
                ]
            )
        else:
            DimensionamentoCircuitoAlimentacaoGeral.objects.filter(
                projeto=projeto
            ).update(
                condutores_aprovado=False,
                secao_condutor_fase_escolhida_mm2=None,
                secao_condutor_neutro_escolhida_mm2=None,
                secao_condutor_pe_escolhida_mm2=None,
                atualizado_em=agora,
            )

        sincronizar_flag_revisao_condutores(projeto)

    return n
