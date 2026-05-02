from .corrente_total import (
    calcular_corrente_total_painel,
    calcular_e_salvar_corrente_total_painel,
)
from .comando import (
    calcular_necessita_fonte_24vcc,
    calcular_e_salvar_necessita_fonte_24vcc,
)
from .automacao import (
    calcular_necessita_plc,
    calcular_e_salvar_necessita_plc,
)
from .base import calcular_e_salvar_dimensionamento_basico
from .circuitos import calcular_e_salvar_circuitos_cargas
from .expansao_plc import calcular_necessita_expansao_plc
from .fonte_24v import calcular_corrente_estimada_fonte_24vcc_a
from .io_plc import calcular_totais_io_plc

__all__ = [
    "calcular_e_salvar_circuitos_cargas",
    "calcular_corrente_total_painel",
    "calcular_e_salvar_corrente_total_painel",
    "calcular_necessita_fonte_24vcc",
    "calcular_e_salvar_necessita_fonte_24vcc",
    "calcular_necessita_plc",
    "calcular_e_salvar_necessita_plc",
    "calcular_e_salvar_dimensionamento_basico",
    "calcular_totais_io_plc",
    "calcular_corrente_estimada_fonte_24vcc_a",
    "calcular_necessita_expansao_plc",
]