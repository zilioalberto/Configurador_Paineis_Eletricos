from decimal import Decimal
from types import SimpleNamespace

from apps.configurador_paineis.dimensionamento.services import corrente_total as corrente_total_service
from core.choices import TipoPainelChoices


class _FakeQuerySet(list):
    def select_related(self, *_args, **_kwargs):
        return self


class _FakeManager:
    def __init__(self, specs):
        self._specs = _FakeQuerySet(specs)

    def filter(self, **_kwargs):
        return self._specs


class _FakeModel:
    def __init__(self, specs):
        self.objects = _FakeManager(specs)


def _spec(corrente_a: str, quantidade: int, numero_fases: int | None):
    return SimpleNamespace(
        corrente_calculada_a=Decimal(corrente_a),
        numero_fases=numero_fases,
        carga=SimpleNamespace(quantidade=quantidade),
    )


def test_corrente_total_balanceia_monofasicas_em_projeto_trifasico():
    projeto = SimpleNamespace(numero_fases=3, fator_demanda=Decimal("1.00"))
    modelos = [
        _FakeModel([_spec("10.00", 3, 1)]),  # Monofásica
        _FakeModel([_spec("6.00", 2, 3)]),   # Trifásica
    ]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    # Monofásicos: (10 * 3) / 3 fases = 10 A balanceado
    # Trifásicos: 6 * 2 = 12 A
    # Total = 22 A
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("22.00")


def test_corrente_total_automacao_ignora_fator_demanda():
    projeto = SimpleNamespace(
        numero_fases=3,
        fator_demanda=Decimal("0.80"),
        tipo_painel=TipoPainelChoices.AUTOMACAO,
    )
    modelos = [_FakeModel([_spec("15.00", 3, 1)])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("15.00")


def test_corrente_total_distribuicao_aplica_fator_demanda():
    projeto = SimpleNamespace(
        numero_fases=3,
        fator_demanda=Decimal("0.80"),
        tipo_painel=TipoPainelChoices.DISTRIBUICAO,
    )
    modelos = [_FakeModel([_spec("15.00", 3, 1)])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("12.00")


def test_corrente_total_considera_fase_mais_sobrecarregada():
    projeto = SimpleNamespace(numero_fases=3, fator_demanda=Decimal("1.00"))
    modelos = [_FakeModel([_spec("10.00", 2, 1)])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    # Distribuição ótima em 3 fases: [10, 10, 0]
    # Corrente total de referência deve ser a fase mais carregada = 10 A.
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("10.00")


def _spec_ma(corrente_ma: int, quantidade: int, numero_fases: int | None):
    return SimpleNamespace(
        corrente_calculada_a=None,
        corrente_consumida_ma=corrente_ma,
        numero_fases=numero_fases,
        carga=SimpleNamespace(quantidade=quantidade),
    )


def test_corrente_total_usa_corrente_consumida_ma_quando_sem_calculada():
    projeto = SimpleNamespace(numero_fases=1, fator_demanda=Decimal("1.00"))
    # 5000 mA => 5 A, quantidade 2 => 10 A na fase única
    modelos = [_FakeModel([_spec_ma(5000, 2, 1)])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("10.00")


def test_corrente_total_ignora_espec_sem_corrente():
    projeto = SimpleNamespace(numero_fases=1, fator_demanda=None)
    sem_corrente = SimpleNamespace(
        corrente_calculada_a=None,
        corrente_consumida_ma=None,
        numero_fases=1,
        carga=SimpleNamespace(quantidade=1),
    )
    modelos = [_FakeModel([sem_corrente])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("0.00")


def test_corrente_total_quantidade_invalida_usa_um():
    projeto = SimpleNamespace(numero_fases=1, fator_demanda=Decimal("1.00"))
    espec = SimpleNamespace(
        corrente_calculada_a=Decimal("4"),
        corrente_consumida_ma=None,
        numero_fases=1,
        carga=SimpleNamespace(quantidade="não-numérico"),
    )
    corrente_total_service.MODELOS_COM_CORRENTE = [_FakeModel([espec])]
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("4.00")


def test_corrente_total_numero_fases_espec_invalido_trata_como_monofasico():
    projeto = SimpleNamespace(numero_fases=3, fator_demanda=Decimal("1.00"))
    espec = SimpleNamespace(
        corrente_calculada_a=Decimal("9"),
        corrente_consumida_ma=None,
        numero_fases="x",
        carga=SimpleNamespace(quantidade=1),
    )
    corrente_total_service.MODELOS_COM_CORRENTE = [_FakeModel([espec])]
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("9.00")


def test_corrente_total_carga_trifasica_em_painel_monofasico():
    projeto = SimpleNamespace(numero_fases=1, fator_demanda=Decimal("1.00"))
    modelos = [_FakeModel([_spec("6.00", 2, 3)])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    # Painel mono limita carga tri a 1 fase: 2 × 6 A = 12 A
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("12.00")


def test_corrente_total_carga_bifasica_distribui_em_duas_fases():
    projeto = SimpleNamespace(numero_fases=3, fator_demanda=Decimal("1.00"))
    modelos = [_FakeModel([_spec("10.00", 1, 2)])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    # Uma unidade bifásica: [10, 10, 0] A — referência = fase mais carregada
    assert corrente_total_service.calcular_correntes_por_fase_painel(projeto) == [
        Decimal("10.00"),
        Decimal("10.00"),
        Decimal("0.00"),
    ]
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("10.00")


def test_correntes_por_fase_painel_retorna_vetor_balanceado():
    projeto = SimpleNamespace(numero_fases=3, fator_demanda=Decimal("1.00"))
    modelos = [
        _FakeModel([_spec("10.00", 3, 1)]),
        _FakeModel([_spec("6.00", 2, 3)]),
    ]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    fases = corrente_total_service.calcular_correntes_por_fase_painel(projeto)
    assert fases == [Decimal("22.00"), Decimal("22.00"), Decimal("22.00")]
    assert corrente_total_service.calcular_corrente_total_painel(projeto) == Decimal("22.00")


def test_corrente_referencia_entrada_identifica_fase_mais_carregada():
    projeto = SimpleNamespace(
        numero_fases=3,
        fator_demanda=Decimal("1.00"),
        tipo_painel="AUTOMACAO",
    )
    modelos = [
        _FakeModel([_spec("30.00", 1, 1)]),
        _FakeModel([_spec("42.00", 1, 1)]),
        _FakeModel([_spec("38.00", 1, 1)]),
    ]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    ref = corrente_total_service.calcular_corrente_referencia_entrada_painel(projeto)
    assert ref.corrente_referencia_a == Decimal("42.00")
    assert ref.corrente_fase_mais_carregada_a == Decimal("42.00")
    assert ref.indice_fase_mais_carregada == 1
