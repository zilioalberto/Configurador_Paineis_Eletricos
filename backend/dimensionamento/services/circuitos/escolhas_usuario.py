from __future__ import annotations

from decimal import Decimal
from typing import Any
import uuid

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from dimensionamento.services.circuitos.revisao_condutores import (
    sincronizar_flag_revisao_condutores,
)
from dimensionamento.services.circuitos.validar_escolhas import (
    validar_escolhas_alimentacao_geral,
    validar_escolhas_circuito_carga,
)


def _dec_or_none(v: Any) -> Decimal | None:
    if v is None or v == "":
        return None
    return Decimal(str(v))


def aplicar_escolhas_condutores(
    projeto,
    *,
    circuitos: list[dict[str, Any]] | None = None,
    alimentacao_geral: dict[str, Any] | None = None,
    confirmar_revisao: bool = False,
) -> ResumoDimensionamento:
    """
    Atualiza escolhas de bitola e opcionalmente marca revisão confirmada no resumo.
    """
    circuitos = circuitos or []
    alimentacao_geral = alimentacao_geral or {}

    with transaction.atomic():
        for row in circuitos:
            cid = row.get("id")
            if not cid:
                raise ValidationError({"circuitos": "Cada item deve ter `id`."})
            try:
                circuit_uuid = cid if isinstance(cid, uuid.UUID) else uuid.UUID(str(cid))
            except (TypeError, ValueError) as exc:
                raise ValidationError({"circuitos": f"id inválido: {cid}"}) from exc

            obj = DimensionamentoCircuitoCarga.objects.select_for_update().filter(
                projeto=projeto, pk=circuit_uuid
            ).first()
            if not obj:
                raise ValidationError(
                    {"circuitos": f"Circuito {cid} não encontrado neste projeto."}
                )

            if "condutores_aprovado" in row:
                novo = bool(row["condutores_aprovado"])
                obj.condutores_aprovado = novo

            if "secao_condutor_fase_escolhida_mm2" in row:
                obj.secao_condutor_fase_escolhida_mm2 = _dec_or_none(
                    row["secao_condutor_fase_escolhida_mm2"]
                )
            if "secao_condutor_neutro_escolhida_mm2" in row:
                obj.secao_condutor_neutro_escolhida_mm2 = _dec_or_none(
                    row["secao_condutor_neutro_escolhida_mm2"]
                )
            if "secao_condutor_pe_escolhida_mm2" in row:
                obj.secao_condutor_pe_escolhida_mm2 = _dec_or_none(
                    row["secao_condutor_pe_escolhida_mm2"]
                )

            validar_escolhas_circuito_carga(obj)
            obj.save(
                update_fields=[
                    "secao_condutor_fase_escolhida_mm2",
                    "secao_condutor_neutro_escolhida_mm2",
                    "secao_condutor_pe_escolhida_mm2",
                    "condutores_aprovado",
                    "atualizado_em",
                ]
            )

        if alimentacao_geral:
            ag, _ = DimensionamentoCircuitoAlimentacaoGeral.objects.get_or_create(
                projeto=projeto
            )
            ag = DimensionamentoCircuitoAlimentacaoGeral.objects.select_for_update().get(
                pk=ag.pk
            )
            if "condutores_aprovado" in alimentacao_geral:
                novo = bool(alimentacao_geral["condutores_aprovado"])
                ag.condutores_aprovado = novo
            if "secao_condutor_fase_escolhida_mm2" in alimentacao_geral:
                ag.secao_condutor_fase_escolhida_mm2 = _dec_or_none(
                    alimentacao_geral["secao_condutor_fase_escolhida_mm2"]
                )
            if "secao_condutor_neutro_escolhida_mm2" in alimentacao_geral:
                ag.secao_condutor_neutro_escolhida_mm2 = _dec_or_none(
                    alimentacao_geral["secao_condutor_neutro_escolhida_mm2"]
                )
            if "secao_condutor_pe_escolhida_mm2" in alimentacao_geral:
                ag.secao_condutor_pe_escolhida_mm2 = _dec_or_none(
                    alimentacao_geral["secao_condutor_pe_escolhida_mm2"]
                )
            validar_escolhas_alimentacao_geral(ag)
            ag.save(
                update_fields=[
                    "secao_condutor_fase_escolhida_mm2",
                    "secao_condutor_neutro_escolhida_mm2",
                    "secao_condutor_pe_escolhida_mm2",
                    "condutores_aprovado",
                    "atualizado_em",
                ]
            )

        resumo, _ = ResumoDimensionamento.objects.select_for_update().get_or_create(
            projeto=projeto
        )
        agora = timezone.now()
        if confirmar_revisao:
            DimensionamentoCircuitoCarga.objects.filter(projeto=projeto).update(
                condutores_aprovado=True,
                atualizado_em=agora,
            )
            DimensionamentoCircuitoAlimentacaoGeral.objects.filter(projeto=projeto).update(
                condutores_aprovado=True,
                atualizado_em=agora,
            )
            resumo.condutores_revisao_confirmada = True
            resumo.save(update_fields=["condutores_revisao_confirmada", "atualizado_em"])
        else:
            sincronizar_flag_revisao_condutores(projeto)

    return ResumoDimensionamento.objects.select_related("projeto").get(projeto=projeto)
