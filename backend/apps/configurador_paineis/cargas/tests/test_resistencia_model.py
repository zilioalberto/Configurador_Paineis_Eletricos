from decimal import Decimal
from types import SimpleNamespace

import pytest
from django.core.exceptions import ValidationError

from apps.configurador_paineis.cargas.models import Carga, CargaResistencia
from core.choices import NumeroFasesChoices, TensaoChoices, TipoCargaChoices
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoReleInterfaceValvulaChoices,
)


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
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        tipo_rele_interface=None,
    )


def test_resistencia_monofasica_em_projeto_trifasico_aceita_tensao_fase():
    resistencia = _fake_resistencia(tensao_resistencia=220)
    CargaResistencia.clean(resistencia)


def test_resistencia_monofasica_em_projeto_trifasico_rejeita_tensao_incompativel():
    resistencia = _fake_resistencia(tensao_resistencia=225)
    with pytest.raises(ValidationError) as exc_info:
        CargaResistencia.clean(resistencia)
    assert "tensao_resistencia" in exc_info.value.message_dict


def test_resistencia_rele_interface_exige_tipo_rele():
    resistencia = _fake_resistencia(tensao_resistencia=220)
    resistencia.tipo_acionamento = TipoAcionamentoResistenciaChoices.RELE_INTERFACE
    resistencia.tipo_rele_interface = None
    with pytest.raises(ValidationError) as exc_info:
        CargaResistencia.clean(resistencia)
    assert "tipo_rele_interface" in exc_info.value.message_dict


def test_resistencia_clean_rejeita_carga_nao_resistencia():
    resistencia = _fake_resistencia(tensao_resistencia=220)
    resistencia.carga.tipo = TipoCargaChoices.MOTOR
    with pytest.raises(ValidationError) as exc_info:
        CargaResistencia.clean(resistencia)
    assert "carga" in exc_info.value.message_dict


def test_resistencia_clean_rejeita_tipo_rele_quando_nao_rele_interface():
    resistencia = _fake_resistencia(tensao_resistencia=220)
    resistencia.tipo_rele_interface = TipoReleInterfaceValvulaChoices.ESTADO_SOLIDO
    with pytest.raises(ValidationError) as exc_info:
        CargaResistencia.clean(resistencia)
    assert "tipo_rele_interface" in exc_info.value.message_dict


@pytest.mark.django_db
def test_resistencia_str_usa_tag_da_carga(criar_projeto):
    projeto = criar_projeto(
        nome="RS",
        codigo="17101-26",
        tensao_nominal=TensaoChoices.V380,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R01",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
        quantidade=1,
    )
    espec = CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        potencia_kw=Decimal("1.000"),
    )
    assert "R01" in str(espec)
