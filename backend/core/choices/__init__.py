from .cargas import (
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    TipoProtecaoMotorChoices,
    TipoValvulaChoices,
    TipoSensorChoices,
    TipoTransdutorChoices,
    TipoConexaoCargaPainelChoices,
    TipoClimatizacaoPainelChoices,
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
    ModoMontagemChoices,
    TipoFixacaoSeccionadoraChoices,
    CorManoplaChoices,
    UnidadeMedidaChoices,
)

from .paineis import (
    TipoPainelChoices,
    TipoSeccionamentoChoices,
    TipoConexaoAlimetacaoChoices,
    PartesPainelChoices,
    StatusProjetoChoices,
    
)

from .gerais import (
    OrigemItemChoices,
    StatusSugestaoChoices,
    StatusPendenciaChoices,
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
    "TipoProtecaoMotorChoices",
    "TipoValvulaChoices",
    "TipoSensorChoices",
    "TipoTransdutorChoices",
    "TipoConexaoCargaPainelChoices",
    "TipoClimatizacaoPainelChoices",
    

    # PRODUTOS
    "CategoriaProdutoNomeChoices",
    "ModoMontagemChoices",
    "TipoFixacaoSeccionadoraChoices",
    "CorManoplaChoices",
    "UnidadeMedidaChoices",
    
    # PAINÉIS
    "TipoPainelChoices",
    "TipoSeccionamentoChoices",
    "TipoConexaoAlimetacaoChoices",
    "StatusProjetoChoices",
    "PartesPainelChoices",
    # GERAIS
    "OrigemItemChoices",
    "StatusSugestaoChoices",
    "StatusPendenciaChoices",
]