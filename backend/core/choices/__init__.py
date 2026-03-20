from .cargas import (
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    TipoValvulaChoices,
    TipoSensorChoices,
    TipoTransdutorChoices,
)

from .eletrica import (
    TensaoChoices,
    TipoCorrenteChoices,
    UnidadePotenciaCorrenteChoices,
    NumeroFasesChoices,
    FrequenciaChoices,
    TipoSinalChoices,
    TipoSinaisAnalogicosChoices,
)

from .produtos import (
    CategoriaProdutoNomeChoices,
    TensaoBobinaChoices,
    ModoMontagemChoices,
    TipoFixacaoSeccionadoraChoices,
    CorManoplaChoices,
    UnidadeMedidaChoices,
)

__all__ = [
  # ELÉTRICA
    "TensaoChoices",
    "TipoCorrenteChoices",
    "UnidadePotenciaCorrenteChoices",
    "NumeroFasesChoices",
    "FrequenciaChoices",
    "TipoSinalChoices",
    "TipoSinaisAnalogicosChoices",

    # CARGAS
    "TipoCargaChoices",
    "TipoPartidaMotorChoices",
    "TipoValvulaChoices",
    "TipoSensorChoices",
    "TipoTransdutorChoices",

    # PRODUTOS
    "CategoriaProdutoNomeChoices",
    "TensaoBobinaChoices",
    "ModoMontagemChoices",
    "TipoFixacaoSeccionadoraChoices",
    "CorManoplaChoices",
    "UnidadeMedidaChoices",
]