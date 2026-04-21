from decimal import Decimal

import pytest

from cargas.models import Carga, CargaMotor
from core.choices import TipoCargaChoices, TensaoChoices, UnidadePotenciaCorrenteChoices
from projetos.services.tensao_nominal_dependentes import (
    reiniciar_dependentes_apos_alteracao_tensao_nominal,
)


@pytest.mark.django_db
def test_escala_entrada_ampere_quando_tensao_projeto_muda(criar_projeto):
    projeto = criar_projeto(nome="P", codigo="07001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    CargaMotor.objects.create(
        carga=carga,
        potencia_corrente_valor=Decimal("10.00"),
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
    )

    projeto.tensao_nominal = TensaoChoices.V220
    projeto.save()

    reiniciar_dependentes_apos_alteracao_tensao_nominal(
        projeto,
        tensao_nominal_anterior=TensaoChoices.V380,
    )

    motor = CargaMotor.objects.get(carga=carga)
    esperado = (Decimal("10.00") * Decimal("380") / Decimal("220")).quantize(Decimal("0.01"))
    assert motor.potencia_corrente_valor == esperado
    assert motor.corrente_calculada_a == esperado
