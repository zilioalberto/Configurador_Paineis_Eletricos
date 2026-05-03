"""Fixtures partilhados por toda a suíte (acessíveis a `projetos`, `composicao_painel`, etc.)."""

import pytest

from cargas.models import CargaMotor
from core.choices import (
    FrequenciaChoices,
    NumeroFasesChoices,
    TensaoChoices,
    TipoConexaoAlimetacaoChoices,
    UnidadePotenciaCorrenteChoices,
)
from projetos.models import Projeto


@pytest.fixture
def projeto_ca_minimo_kwargs():
    """Campos exigidos por `Projeto.clean()` para alimentação CA com neutro/terra."""
    return {
        "numero_fases": NumeroFasesChoices.TRIFASICO,
        "frequencia": FrequenciaChoices.HZ60,
        "tipo_conexao_alimentacao_neutro": TipoConexaoAlimetacaoChoices.BORNE,
        "tipo_conexao_alimentacao_terra": TipoConexaoAlimetacaoChoices.BORNE,
    }


@pytest.fixture
def criar_projeto(projeto_ca_minimo_kwargs):
    def _criar(*, nome: str, codigo: str, **extra):
        return Projeto.objects.create(
            nome=nome,
            codigo=codigo,
            **{**projeto_ca_minimo_kwargs, **extra},
        )

    return _criar


@pytest.fixture
def criar_carga_motor():
    """Factory com defaults estáveis para CargaMotor em testes."""

    def _criar(*, carga, **extra):
        payload = {
            "carga": carga,
            "potencia_corrente_valor": "1.00",
            "potencia_corrente_unidade": UnidadePotenciaCorrenteChoices.CV,
            "tensao_motor": TensaoChoices.V220,
        }
        payload.update(extra)
        return CargaMotor.objects.create(**payload)

    return _criar
