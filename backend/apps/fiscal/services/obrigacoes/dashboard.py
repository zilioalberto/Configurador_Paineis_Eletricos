"""Dashboard e alertas de obrigações fiscais."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from apps.fiscal.choices import StatusObrigacaoFiscalChoices
from apps.fiscal.models_obrigacoes import ObrigacaoFiscal, PacoteObrigacaoFiscal


def montar_dashboard_obrigacoes(*, cnpj: str) -> dict:
    hoje = timezone.localdate()
    limite_7 = hoje + timedelta(days=7)

    obrigacoes = ObrigacaoFiscal.objects.filter(pacote__cnpj=cnpj)
    pendentes = obrigacoes.filter(status=StatusObrigacaoFiscalChoices.PENDENTE)
    vencidas = obrigacoes.filter(status=StatusObrigacaoFiscalChoices.VENCIDO)
    vence_7 = pendentes.filter(data_vencimento__gte=hoje, data_vencimento__lte=limite_7)

    total_pendente = pendentes.aggregate(t=Sum("valor"))["t"] or Decimal("0")
    total_vencido = vencidas.aggregate(t=Sum("valor"))["t"] or Decimal("0")
    total_7 = vence_7.aggregate(t=Sum("valor"))["t"] or Decimal("0")

    pacotes_recentes = (
        PacoteObrigacaoFiscal.objects.filter(cnpj=cnpj)
        .order_by("-competencia")[:6]
    )

    alertas: list[str] = []
    if vencidas.exists():
        alertas.append(f"{vencidas.count()} obrigação(ões) vencida(s).")
    if vence_7.exists():
        alertas.append(f"{vence_7.count()} obrigação(ões) vence(m) em até 7 dias.")
    incompletos = PacoteObrigacaoFiscal.objects.filter(cnpj=cnpj, pacote_completo=False).count()
    if incompletos:
        alertas.append(f"{incompletos} competência(s) com pacote contabilidade incompleto.")

    return {
        "total_pendente": str(total_pendente),
        "total_vencido": str(total_vencido),
        "total_vence_7_dias": str(total_7),
        "quantidade_pendentes": pendentes.count(),
        "quantidade_vencidas": vencidas.count(),
        "quantidade_vence_7_dias": vence_7.count(),
        "alertas": alertas,
        "competencias_recentes": [
            {
                "competencia": p.competencia,
                "public_id": str(p.public_id),
                "pacote_completo": p.pacote_completo,
            }
            for p in pacotes_recentes
        ],
    }
