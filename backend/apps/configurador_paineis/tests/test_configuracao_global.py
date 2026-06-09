from decimal import Decimal

import pytest

from apps.configuracoes_erp.models import ParametroConfiguracao
from apps.configurador_paineis.configuracao_global import (
    CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES,
    CHAVE_TAXA_OCUPACAO_MAX_PLACA,
    DEGRAUS_MARGEM_BITOLA_PADRAO,
    TAXA_OCUPACAO_MAX_PLACA_PADRAO,
    obter_degraus_margem_bitola_condutores,
    obter_taxa_ocupacao_max_placa_percentual,
)


@pytest.mark.django_db
def test_obter_degraus_margem_bitola_do_parametro_erp():
    ParametroConfiguracao.objects.create(
        chave=CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES,
        valor="0",
        descricao="teste",
    )
    assert obter_degraus_margem_bitola_condutores() == 0


@pytest.mark.django_db
def test_obter_degraus_margem_bitola_padrao_sem_parametro():
    assert obter_degraus_margem_bitola_condutores() == DEGRAUS_MARGEM_BITOLA_PADRAO


@pytest.mark.django_db
def test_obter_degraus_margem_bitola_valor_invalido_usa_padrao():
    ParametroConfiguracao.objects.create(
        chave=CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES,
        valor="xyz",
    )
    assert obter_degraus_margem_bitola_condutores() == DEGRAUS_MARGEM_BITOLA_PADRAO


@pytest.mark.django_db
def test_obter_taxa_ocupacao_max_placa_padrao_sem_parametro():
    assert obter_taxa_ocupacao_max_placa_percentual() == TAXA_OCUPACAO_MAX_PLACA_PADRAO


@pytest.mark.django_db
def test_obter_taxa_ocupacao_max_placa_do_parametro_erp():
    ParametroConfiguracao.objects.create(
        chave=CHAVE_TAXA_OCUPACAO_MAX_PLACA,
        valor="70",
    )
    assert obter_taxa_ocupacao_max_placa_percentual() == Decimal("70.00")
