from .cargas import (
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
    TipoAcionamentoResistenciaChoices,
    TipoValvulaChoices,
    TipoProtecaoValvulaChoices,
    TipoAcionamentoValvulaChoices,
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
    TipoFusivelUltrarrapidoChoices,
    TipoFusivelNHChoices,
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

from .usuarios import (
    DEFAULT_PERMISSIONS_BY_TIPO,
    PermissaoUsuarioChoices,
    TipoUsuarioChoices,
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
    "TipoProtecaoResistenciaChoices",
    "TipoAcionamentoResistenciaChoices",
    "TipoValvulaChoices",
    "TipoProtecaoValvulaChoices",
    "TipoAcionamentoValvulaChoices",
    "TipoSensorChoices",
    "TipoTransdutorChoices",
    "TipoConexaoCargaPainelChoices",
    "TipoClimatizacaoPainelChoices",
    

    # PRODUTOS
    "CategoriaProdutoNomeChoices",
    "TipoFusivelUltrarrapidoChoices",
    "TipoFusivelNHChoices",
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
    
    # USUÁRIOS
    "TipoUsuarioChoices",
    "PermissaoUsuarioChoices",
    "DEFAULT_PERMISSIONS_BY_TIPO",
]