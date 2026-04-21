"""Fixtures partilhados por toda a suíte (acessíveis a `projetos`, `composicao_painel`, etc.)."""

import pytest

from core.choices import FrequenciaChoices, NumeroFasesChoices, TipoConexaoAlimetacaoChoices
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
