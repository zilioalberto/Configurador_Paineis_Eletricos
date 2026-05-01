from decimal import Decimal
from types import SimpleNamespace

from dimensionamento.services import corrente_total as corrente_total_service


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


def test_corrente_total_aplica_fator_demanda_apos_balanceamento():
    projeto = SimpleNamespace(numero_fases=3, fator_demanda=Decimal("0.80"))
    modelos = [_FakeModel([_spec("15.00", 3, 1)])]
    corrente_total_service.MODELOS_COM_CORRENTE = modelos

    # Base balanceada = (15 * 3) / 3 = 15 A
    # Com FD 0.80 => 12.00 A
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
