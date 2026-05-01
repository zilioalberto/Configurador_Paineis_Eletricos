from types import SimpleNamespace
from unittest.mock import patch

import pytest

from cargas.models import Carga, CargaResistencia
from composicao_painel.models import PendenciaItem
from composicao_painel.services.sugestoes.pendencias_sem_regra import (
    sincronizar_pendencias_cargas_sem_regra_catalogo,
)
from core.choices import CategoriaProdutoNomeChoices, PartesPainelChoices, TensaoChoices
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoProtecaoResistenciaChoices,
)


@pytest.mark.django_db
def test_resistencia_fusivel_rele_gera_pendencia_sem_regra(criar_projeto):
    projeto = criar_projeto(nome="PSR", codigo="13001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R01",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
        quantidade=1,
    )
    resistencia_mock = SimpleNamespace(
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
    )
    with patch(
        "composicao_painel.services.sugestoes.pendencias_sem_regra.CargaResistencia.objects.get",
        return_value=resistencia_mock,
    ):
        criadas = sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)
    assert len(criadas) == 1
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).count() == 1
    p = criadas[0]
    assert p.categoria_produto == CategoriaProdutoNomeChoices.SEM_REGRA_SUGESTAO_AUTOMATICA
    assert p.parte_painel == PartesPainelChoices.PROTECAO_GERAL


@pytest.mark.django_db
def test_resistencia_contator_nao_gera_pendencia_sem_regra(criar_projeto):
    projeto = criar_projeto(nome="PSR2", codigo="13002-26", tensao_nominal=TensaoChoices.V380)
    Carga.objects.create(
        projeto=projeto,
        tag="R02",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
        quantidade=1,
    )
    resistencia_mock = SimpleNamespace(
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
    )
    with patch(
        "composicao_painel.services.sugestoes.pendencias_sem_regra.CargaResistencia.objects.get",
        return_value=resistencia_mock,
    ):
        criadas = sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)
    assert len(criadas) == 0


@pytest.mark.django_db
def test_motor_nao_gera_pendencia_sem_regra(criar_projeto):
    projeto = criar_projeto(nome="PSM", codigo="13003-26", tensao_nominal=TensaoChoices.V380)
    Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )

    criadas = sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)
    assert len(criadas) == 0


@pytest.mark.django_db
def test_sincronizar_remove_pendencia_quando_carga_passa_a_ter_regra(criar_projeto):
    """Segunda sincronização sem pendências quando antes havia registro."""
    projeto = criar_projeto(nome="PSR3", codigo="13004-26", tensao_nominal=TensaoChoices.V380)
    Carga.objects.create(
        projeto=projeto,
        tag="R03",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
        quantidade=1,
    )
    rele_fusivel = SimpleNamespace(
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
    )
    com_contator = SimpleNamespace(
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
    )
    with patch(
        "composicao_painel.services.sugestoes.pendencias_sem_regra.CargaResistencia.objects.get",
        return_value=rele_fusivel,
    ):
        assert len(sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)) == 1
    with patch(
        "composicao_painel.services.sugestoes.pendencias_sem_regra.CargaResistencia.objects.get",
        return_value=com_contator,
    ):
        assert len(sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)) == 0
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0


@pytest.mark.django_db
def test_sensor_gera_pendencia_sem_regra(criar_projeto):
    projeto = criar_projeto(nome="PSS", codigo="13005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S01",
        descricao="Sensor",
        tipo=TipoCargaChoices.SENSOR,
        quantidade=1,
    )
    criadas = sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)
    assert len(criadas) == 1
    assert "Não há gerador" in criadas[0].memoria_calculo


@pytest.mark.django_db
def test_valvula_gera_pendencia_sem_regra(criar_projeto):
    projeto = criar_projeto(nome="PSV", codigo="13006-26", tensao_nominal=TensaoChoices.V380)
    Carga.objects.create(
        projeto=projeto,
        tag="V01",
        descricao="Válvula",
        tipo=TipoCargaChoices.VALVULA,
        quantidade=1,
    )
    criadas = sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)
    assert len(criadas) == 1


@pytest.mark.django_db
def test_resistencia_memoria_quando_cargaresistencia_some_antes_da_memoria(
    criar_projeto,
):
    """Cobre `except CargaResistencia.DoesNotExist` em `_memoria_e_descricao_carga_sem_regra`."""
    projeto = criar_projeto(nome="PSX", codigo="13007-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R99",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
        quantidade=1,
    )
    mock_r = SimpleNamespace(
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
    )
    calls = {"n": 0}

    def get_side_effect(*_a, **_kw):
        calls["n"] += 1
        if calls["n"] == 1:
            return mock_r
        raise CargaResistencia.DoesNotExist

    with patch(
        "composicao_painel.services.sugestoes.pendencias_sem_regra.CargaResistencia.objects.get",
        side_effect=get_side_effect,
    ):
        criadas = sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)
    assert len(criadas) == 1
    assert "CargaResistência" in criadas[0].memoria_calculo or "CargaResist" in criadas[0].memoria_calculo
