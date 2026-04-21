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
