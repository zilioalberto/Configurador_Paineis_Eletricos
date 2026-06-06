import pytest

from apps.configuracoes_erp.models import ParametroConfiguracao
from apps.configurador_paineis.configuracao_global import (
    CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES,
    DEGRAUS_MARGEM_BITOLA_PADRAO,
    obter_degraus_margem_bitola_condutores,
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
