from types import SimpleNamespace

import pytest
from django.core.exceptions import ValidationError

from cargas.models.resistencia import CargaResistencia
from core.choices import NumeroFasesChoices, TipoCargaChoices


def _fake_resistencia(*, tensao_resistencia: int):
    projeto = SimpleNamespace(
        tensao_nominal=380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    return SimpleNamespace(
        carga=SimpleNamespace(
            tipo=TipoCargaChoices.RESISTENCIA,
            projeto=projeto,
            tag="R01",
        ),
        numero_fases=NumeroFasesChoices.MONOFASICO,
        tensao_resistencia=tensao_resistencia,
        potencia_kw=1.5,
    )


def test_resistencia_monofasica_em_projeto_trifasico_aceita_tensao_fase():
    resistencia = _fake_resistencia(tensao_resistencia=220)
    CargaResistencia.clean(resistencia)


def test_resistencia_monofasica_em_projeto_trifasico_rejeita_tensao_incompativel():
    resistencia = _fake_resistencia(tensao_resistencia=225)
    with pytest.raises(ValidationError) as exc_info:
        CargaResistencia.clean(resistencia)
    assert "tensao_resistencia" in exc_info.value.message_dict
