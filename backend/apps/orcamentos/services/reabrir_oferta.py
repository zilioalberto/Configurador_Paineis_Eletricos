from __future__ import annotations

from django.db import transaction

from apps.orcamentos.models import Orcamento, OrcamentoSnapshot, StatusOrcamentoChoices


@transaction.atomic
def reabrir_oferta_finalizada(orcamento: Orcamento) -> Orcamento:
    if orcamento.status != StatusOrcamentoChoices.FINALIZADO:
        raise ValueError("Somente ofertas finalizadas e não enviadas podem ser reabertas.")

    OrcamentoSnapshot.objects.filter(orcamento=orcamento).delete()
    orcamento._state.fields_cache.pop("snapshot_envio", None)
    orcamento.status = StatusOrcamentoChoices.RASCUNHO
    orcamento.save(update_fields=("status", "atualizado_em"))
    orcamento.refresh_from_db()
    return orcamento
