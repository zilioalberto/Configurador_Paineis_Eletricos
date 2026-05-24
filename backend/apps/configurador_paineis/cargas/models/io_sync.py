"""Utilitários para zerar e persistir contadores de IO derivados das especificações."""

IO_UPDATE_FIELDS = (
    "quantidade_entradas_digitais",
    "quantidade_entradas_analogicas",
    "quantidade_saidas_digitais",
    "quantidade_saidas_analogicas",
    "quantidade_entradas_rapidas",
)


def reset_io_flags(carga) -> None:
    """Zera todos os contadores de entradas/saídas antes de recalcular."""
    carga.quantidade_entradas_digitais = 0
    carga.quantidade_entradas_analogicas = 0
    carga.quantidade_saidas_digitais = 0
    carga.quantidade_saidas_analogicas = 0
    carga.quantidade_entradas_rapidas = 0


def save_io_flags(carga) -> None:
    """Persiste apenas os campos de IO, evitando loop com save() da especificação."""
    carga.save(update_fields=list(IO_UPDATE_FIELDS))
