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
    TensaoBobinaChoices,
    ModoMontagemChoices,
    TipoFixacaoSeccionadoraChoices,
    CorManoplaChoices,
    UnidadeMedidaChoices,
)

from .paineis import (
    TipoPainelChoices,
    TipoSeccionamentoChoices,
    TipoConexaoAlimetacaoChoices,
    StatusProjetoChoices,
    
)

from .gerais import (
    OrigemItem,
    StatusSugestao,
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
    "TensaoBobinaChoices",
    "ModoMontagemChoices",
    "TipoFixacaoSeccionadoraChoices",
    "CorManoplaChoices",
    "UnidadeMedidaChoices",
    
    # PAINÉIS
    "TipoPainelChoices",
    "TipoSeccionamentoChoices",
    "TipoConexaoAlimetacaoChoices",
    "StatusProjetoChoices",
    'PartesPainelChoices'
    
    # GERAIS
    "OrigemItem",
    "StatusSugestao",
      
    
]