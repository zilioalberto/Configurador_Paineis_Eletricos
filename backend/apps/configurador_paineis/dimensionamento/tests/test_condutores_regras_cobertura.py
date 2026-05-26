from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.configurador_paineis.cargas.models import Carga
from core.choices import (
    NumeroFasesChoices,
    TensaoChoices,
    TipoCargaChoices,
    TipoCorrenteChoices,
    TipoSinalChoices,
)
from apps.configurador_paineis.dimensionamento.models import (
    ClassificacaoCircuitoChoices,
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from apps.configurador_paineis.dimensionamento.services.circuitos.dimensionar import (
    dimensionar_circuito_para_carga,
    dimensionar_motor,
    dimensionar_resistencia,
    dimensionar_sensor,
    dimensionar_transdutor,
    dimensionar_transmissor,
    dimensionar_valvula,
)
from apps.configurador_paineis.dimensionamento.services.circuitos.alimentacao_geral import (
    dimensionar_circuito_alimentacao_geral,
)
from apps.configurador_paineis.dimensionamento.services.circuitos.escolhas_usuario import (
    aplicar_escolhas_condutores,
)
from apps.configurador_paineis.dimensionamento.services.circuitos.revisao_condutores import (
    sincronizar_flag_revisao_condutores,
)
from apps.configurador_paineis.dimensionamento.services.circuitos.validar_escolhas import (
    validar_escolhas_alimentacao_geral,
    validar_escolhas_circuito_carga,
)


def _projeto_stub(**overrides):
    data = {
        "fator_demanda": Decimal("1.00"),
        "degraus_margem_bitola_condutores": 0,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _patch_margem_global(monkeypatch, degraus: int) -> None:
    """Margem de bitola vem do parâmetro ERP; nos testes unitários fixamos via mock."""
    for mod in (
        "apps.configurador_paineis.dimensionamento.services.circuitos.dimensionar",
        "apps.configurador_paineis.dimensionamento.services.circuitos.alimentacao_geral",
    ):
        monkeypatch.setattr(
            f"{mod}.obter_degraus_margem_bitola_condutores",
            lambda d=degraus: d,
        )


def _circuito_stub(**overrides):
    data = {
        "corrente_projeto_a": Decimal("5.00"),
        "corrente_calculada_a": Decimal("5.00"),
        "classificacao_circuito": ClassificacaoCircuitoChoices.POTENCIA,
        "tipo_carga": TipoCargaChoices.RESISTENCIA,
        "possui_neutro": True,
        "possui_pe": True,
        "secao_condutor_fase_mm2": Decimal("2.50"),
        "secao_condutor_neutro_mm2": Decimal("2.50"),
        "secao_condutor_pe_mm2": Decimal("2.50"),
        "secao_condutor_fase_escolhida_mm2": None,
        "secao_condutor_neutro_escolhida_mm2": None,
        "secao_condutor_pe_escolhida_mm2": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _ag_stub(**overrides):
    data = {
        "corrente_total_painel_a": Decimal("5.00"),
        "possui_neutro": True,
        "possui_terra": True,
        "secao_condutor_fase_mm2": Decimal("2.50"),
        "secao_condutor_neutro_mm2": Decimal("2.50"),
        "secao_condutor_pe_mm2": Decimal("2.50"),
        "secao_condutor_fase_escolhida_mm2": None,
        "secao_condutor_neutro_escolhida_mm2": None,
        "secao_condutor_pe_escolhida_mm2": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_validar_escolhas_circuito_rejeita_secao_nao_comercial():
    obj = _circuito_stub(secao_condutor_fase_escolhida_mm2=Decimal("3.00"))

    with pytest.raises(ValidationError) as excinfo:
        validar_escolhas_circuito_carga(obj)

    assert "valor comercial" in " ".join(excinfo.value.messages)


def test_validar_escolhas_circuito_rejeita_minimo_iz_e_neutro():
    obj = _circuito_stub(
        tipo_carga=TipoCargaChoices.MOTOR,
        corrente_projeto_a=Decimal("40.00"),
        corrente_calculada_a=Decimal("40.00"),
        secao_condutor_fase_escolhida_mm2=Decimal("1.00"),
        secao_condutor_neutro_escolhida_mm2=Decimal("1.00"),
    )

    with pytest.raises(ValidationError) as excinfo:
        validar_escolhas_circuito_carga(obj)

    msg = " ".join(excinfo.value.messages)
    assert "Fase" in msg
    assert "Neutro" in msg
    assert "corrente de referência" in msg


def test_validar_escolhas_circuito_rejeita_pe_menor_que_fase_efetiva():
    obj = _circuito_stub(
        corrente_projeto_a=Decimal("5.00"),
        secao_condutor_fase_escolhida_mm2=Decimal("16.00"),
        secao_condutor_pe_escolhida_mm2=Decimal("2.50"),
    )

    with pytest.raises(ValidationError) as excinfo:
        validar_escolhas_circuito_carga(obj)

    assert "PE: seção mínima" in " ".join(excinfo.value.messages)


def test_validar_escolhas_circuito_aceita_comando_sem_neutro_ou_pe():
    obj = _circuito_stub(
        classificacao_circuito=ClassificacaoCircuitoChoices.COMANDO,
        tipo_carga=None,
        possui_neutro=False,
        possui_pe=False,
        corrente_projeto_a=None,
        corrente_calculada_a=None,
        secao_condutor_fase_escolhida_mm2=Decimal("1.00"),
        secao_condutor_neutro_mm2=None,
        secao_condutor_pe_mm2=None,
    )

    validar_escolhas_circuito_carga(obj)


def test_validar_escolhas_alimentacao_geral_rejeita_iz_neutro_e_pe_invalidos():
    obj = _ag_stub(
        corrente_total_painel_a=Decimal("40.00"),
        secao_condutor_fase_escolhida_mm2=Decimal("2.50"),
        secao_condutor_neutro_escolhida_mm2=Decimal("1.50"),
        secao_condutor_pe_escolhida_mm2=Decimal("1.50"),
    )

    with pytest.raises(ValidationError) as excinfo:
        validar_escolhas_alimentacao_geral(obj)

    msg = " ".join(excinfo.value.messages)
    assert "Fase" in msg
    assert "Neutro" in msg
    assert "PE" in msg


def test_dimensionar_motor_monofasico_usa_corrente_ma_e_defaults_defensivos(monkeypatch):
    _patch_margem_global(monkeypatch, 0)
    espec = SimpleNamespace(
        corrente_consumida_ma=Decimal("500"),
        numero_fases=NumeroFasesChoices.MONOFASICO,
    )
    projeto = _projeto_stub(fator_demanda=None)
    carga = SimpleNamespace(quantidade="abc")

    dados = dimensionar_motor(espec, projeto, carga)

    assert dados["corrente_calculada_a"] == Decimal("0.5")
    assert dados["corrente_projeto_a"] == Decimal("0.50")
    assert dados["quantidade_condutores_fase"] == 1
    assert dados["possui_neutro"] is True
    assert dados["secao_condutor_neutro_mm2"] == dados["secao_condutor_fase_mm2"]


def test_dimensionar_resistencia_monofasica_registra_margem_de_bitola(monkeypatch):
    _patch_margem_global(monkeypatch, 1)
    espec = SimpleNamespace(
        corrente_calculada_a=Decimal("8.00"),
        numero_fases=NumeroFasesChoices.MONOFASICO,
    )
    projeto = _projeto_stub()
    carga = SimpleNamespace(quantidade=2)

    dados = dimensionar_resistencia(espec, projeto, carga)

    assert dados["corrente_projeto_a"] == Decimal("16.00")
    assert dados["possui_neutro"] is True
    assert "Margem de bitola" in dados["memoria_calculo"]


def test_dimensionar_comando_sensores_transdutor_e_transmissor():
    projeto = _projeto_stub()
    carga = SimpleNamespace(quantidade=1)

    valvula_ca = dimensionar_valvula(
        SimpleNamespace(tipo_corrente=TipoCorrenteChoices.CA, corrente_consumida_ma=120),
        projeto,
        carga,
    )
    valvula_cc = dimensionar_valvula(
        SimpleNamespace(tipo_corrente=TipoCorrenteChoices.CC, corrente_consumida_ma=120),
        projeto,
        carga,
    )
    sensor_digital = dimensionar_sensor(
        SimpleNamespace(tipo_sinal=TipoSinalChoices.DIGITAL, corrente_consumida_ma=20),
        projeto,
        carga,
    )
    sensor_analogico = dimensionar_sensor(
        SimpleNamespace(tipo_sinal=TipoSinalChoices.ANALOGICO, corrente_consumida_ma=20),
        projeto,
        carga,
    )
    transdutor = dimensionar_transdutor(
        SimpleNamespace(corrente_consumida_ma=40),
        projeto,
        carga,
    )
    transmissor = dimensionar_transmissor()

    assert valvula_ca["possui_neutro"] is True
    assert valvula_cc["possui_neutro"] is False
    assert sensor_digital["possui_pe"] is False
    assert sensor_analogico["possui_pe"] is True
    assert transdutor["tipo_carga"] == TipoCargaChoices.TRANSDUTOR
    assert transmissor["tipo_carga"] == TipoCargaChoices.TRANSMISSOR


def test_dimensionar_alimentacao_geral_cobre_cc_mono_e_fallback_trifasico(monkeypatch):
    resumo = SimpleNamespace(corrente_total_painel_a=Decimal("12.00"))

    _patch_margem_global(monkeypatch, 1)
    cc = dimensionar_circuito_alimentacao_geral(
        SimpleNamespace(
            tipo_corrente=TipoCorrenteChoices.CC,
            numero_fases=None,
            possui_neutro=True,
            possui_terra=True,
        ),
        resumo,
    )
    _patch_margem_global(monkeypatch, 0)
    mono = dimensionar_circuito_alimentacao_geral(
        SimpleNamespace(
            tipo_corrente=TipoCorrenteChoices.CA,
            numero_fases=NumeroFasesChoices.MONOFASICO,
            possui_neutro=True,
            possui_terra=True,
        ),
        resumo,
    )
    _patch_margem_global(monkeypatch, 1)
    fallback = dimensionar_circuito_alimentacao_geral(
        SimpleNamespace(
            tipo_corrente=TipoCorrenteChoices.CA,
            numero_fases=99,
            possui_neutro=False,
            possui_terra=False,
        ),
        resumo,
    )

    assert cc["tipo_corrente"] == TipoCorrenteChoices.CC
    assert cc["quantidade_condutores_fase"] == 2
    assert cc["secao_condutor_pe_mm2"] is not None
    assert "Margem de bitola" in cc["memoria_calculo"]
    assert mono["numero_fases"] == NumeroFasesChoices.MONOFASICO
    assert mono["quantidade_condutores_fase"] == 1
    assert mono["quantidade_condutores_neutro"] == 1
    assert fallback["numero_fases"] == NumeroFasesChoices.TRIFASICO
    assert fallback["quantidade_condutores_fase"] == 3


def test_dimensionar_circuito_para_carga_retorna_none_sem_especificacao():
    projeto = _projeto_stub()

    assert (
        dimensionar_circuito_para_carga(
            SimpleNamespace(tipo=TipoCargaChoices.MOTOR, motor=None),
            projeto,
        )
        is None
    )
    assert (
        dimensionar_circuito_para_carga(
            SimpleNamespace(tipo=TipoCargaChoices.RESISTENCIA, resistencia=None),
            projeto,
        )
        is None
    )
    assert (
        dimensionar_circuito_para_carga(
            SimpleNamespace(tipo=TipoCargaChoices.VALVULA, valvula=None),
            projeto,
        )
        is None
    )
    assert (
        dimensionar_circuito_para_carga(
            SimpleNamespace(tipo=TipoCargaChoices.SENSOR, sensor=None),
            projeto,
        )
        is None
    )
    assert (
        dimensionar_circuito_para_carga(
            SimpleNamespace(tipo=TipoCargaChoices.TRANSDUTOR, transdutor=None),
            projeto,
        )
        is None
    )
    assert dimensionar_circuito_para_carga(SimpleNamespace(tipo="OUTRO"), projeto) is None


def test_dimensionar_circuito_para_carga_despacha_especificacoes_presentes(monkeypatch):
    _patch_margem_global(monkeypatch, 0)
    projeto = _projeto_stub()

    resistencia = dimensionar_circuito_para_carga(
        SimpleNamespace(
            tipo=TipoCargaChoices.RESISTENCIA,
            resistencia=SimpleNamespace(
                corrente_calculada_a=Decimal("2.00"),
                numero_fases=NumeroFasesChoices.TRIFASICO,
            ),
            quantidade=1,
        ),
        projeto,
    )
    valvula = dimensionar_circuito_para_carga(
        SimpleNamespace(
            tipo=TipoCargaChoices.VALVULA,
            valvula=SimpleNamespace(tipo_corrente=TipoCorrenteChoices.CC),
            quantidade=1,
        ),
        projeto,
    )
    sensor = dimensionar_circuito_para_carga(
        SimpleNamespace(
            tipo=TipoCargaChoices.SENSOR,
            sensor=SimpleNamespace(tipo_sinal=TipoSinalChoices.DIGITAL),
            quantidade=1,
        ),
        projeto,
    )
    transdutor = dimensionar_circuito_para_carga(
        SimpleNamespace(
            tipo=TipoCargaChoices.TRANSDUTOR,
            transdutor=SimpleNamespace(corrente_consumida_ma=40),
            quantidade=1,
        ),
        projeto,
    )
    transmissor = dimensionar_circuito_para_carga(
        SimpleNamespace(tipo=TipoCargaChoices.TRANSMISSOR, quantidade=1),
        projeto,
    )

    assert resistencia["tipo_carga"] == TipoCargaChoices.RESISTENCIA
    assert valvula["tipo_carga"] == TipoCargaChoices.VALVULA
    assert sensor["tipo_carga"] == TipoCargaChoices.SENSOR
    assert transdutor["tipo_carga"] == TipoCargaChoices.TRANSDUTOR
    assert transmissor["tipo_carga"] == TipoCargaChoices.TRANSMISSOR


def _criar_circuito_e_ag(projeto):
    ResumoDimensionamento.objects.get_or_create(
        projeto=projeto,
        defaults={"corrente_total_painel_a": Decimal("10.00")},
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    circuito = DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.MOTOR,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        corrente_calculada_a=Decimal("10.00"),
        corrente_projeto_a=Decimal("10.00"),
        quantidade_condutores_fase=3,
        possui_neutro=False,
        possui_pe=True,
        secao_condutor_fase_mm2=Decimal("2.50"),
        secao_condutor_pe_mm2=Decimal("2.50"),
    )
    ag = DimensionamentoCircuitoAlimentacaoGeral.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("10.00"),
        tipo_corrente=TipoCorrenteChoices.CA,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        possui_neutro=True,
        possui_terra=True,
        quantidade_condutores_fase=3,
        quantidade_condutores_neutro=1,
        secao_condutor_fase_mm2=Decimal("2.50"),
        secao_condutor_neutro_mm2=Decimal("2.50"),
        secao_condutor_pe_mm2=Decimal("2.50"),
    )
    return circuito, ag


@pytest.mark.django_db
def test_aplicar_escolhas_condutores_valida_ids_invalidos(criar_projeto):
    projeto = criar_projeto(
        nome="IDs inválidos",
        codigo="53001-26",
        tensao_nominal=TensaoChoices.V380,
    )

    with pytest.raises(ValidationError, match="Cada item"):
        aplicar_escolhas_condutores(projeto, circuitos=[{}])

    with pytest.raises(ValidationError, match="id inválido"):
        aplicar_escolhas_condutores(projeto, circuitos=[{"id": "abc"}])

    with pytest.raises(ValidationError, match="não encontrado"):
        aplicar_escolhas_condutores(projeto, circuitos=[{"id": str(uuid4())}])


@pytest.mark.django_db
def test_aplicar_escolhas_condutores_converte_vazios_e_sincroniza_revisao(criar_projeto):
    projeto = criar_projeto(
        nome="Escolhas",
        codigo="53002-26",
        tensao_nominal=TensaoChoices.V380,
    )
    circuito, ag = _criar_circuito_e_ag(projeto)

    resumo = aplicar_escolhas_condutores(
        projeto,
        circuitos=[
            {
                "id": str(circuito.id),
                "secao_condutor_fase_escolhida_mm2": "2.5",
                "secao_condutor_pe_escolhida_mm2": "",
                "condutores_aprovado": True,
            }
        ],
        alimentacao_geral={
            "secao_condutor_fase_escolhida_mm2": "2.5",
            "secao_condutor_neutro_escolhida_mm2": "",
            "condutores_aprovado": True,
        },
    )

    circuito.refresh_from_db()
    ag.refresh_from_db()
    assert circuito.secao_condutor_fase_escolhida_mm2 == Decimal("2.50")
    assert circuito.secao_condutor_pe_escolhida_mm2 is None
    assert circuito.condutores_aprovado is True
    assert ag.secao_condutor_neutro_escolhida_mm2 is None
    assert ag.condutores_aprovado is True
    assert resumo.condutores_revisao_confirmada is True


@pytest.mark.django_db
def test_aplicar_escolhas_condutores_confirmar_revisao_aprova_tudo(criar_projeto):
    projeto = criar_projeto(
        nome="Confirmar",
        codigo="53003-26",
        tensao_nominal=TensaoChoices.V380,
    )
    circuito, ag = _criar_circuito_e_ag(projeto)

    resumo = aplicar_escolhas_condutores(projeto, confirmar_revisao=True)

    circuito.refresh_from_db()
    ag.refresh_from_db()
    assert circuito.condutores_aprovado is True
    assert ag.condutores_aprovado is True
    assert resumo.condutores_revisao_confirmada is True


@pytest.mark.django_db
def test_sincronizar_flag_revisao_condutores_sem_circuitos_forca_pendente(criar_projeto):
    projeto = criar_projeto(
        nome="Sem circuitos",
        codigo="53004-26",
        tensao_nominal=TensaoChoices.V380,
    )
    resumo = ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("0.00"),
        condutores_revisao_confirmada=True,
    )

    sincronizar_flag_revisao_condutores(projeto)

    resumo.refresh_from_db()
    assert resumo.condutores_revisao_confirmada is False


@pytest.mark.django_db
def test_sincronizar_flag_revisao_condutores_exige_alimentacao_aprovada(criar_projeto):
    projeto = criar_projeto(
        nome="AG pendente",
        codigo="53005-26",
        tensao_nominal=TensaoChoices.V380,
    )
    circuito, ag = _criar_circuito_e_ag(projeto)
    circuito.condutores_aprovado = True
    circuito.save(update_fields=["condutores_aprovado"])

    sincronizar_flag_revisao_condutores(projeto)
    resumo = ResumoDimensionamento.objects.get(projeto=projeto)
    assert resumo.condutores_revisao_confirmada is False

    ag.condutores_aprovado = True
    ag.save(update_fields=["condutores_aprovado"])
    sincronizar_flag_revisao_condutores(projeto)
    resumo.refresh_from_db()
    assert resumo.condutores_revisao_confirmada is True
