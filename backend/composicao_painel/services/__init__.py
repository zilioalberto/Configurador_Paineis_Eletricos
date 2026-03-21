# ==========================================================
# APROVAÇÕES
# ==========================================================
from .aprovacoes import (
    aprovar_sugestao,
    aprovar_sugestoes_projeto,
    rejeitar_sugestao,
    rejeitar_sugestoes_projeto,
)

# ==========================================================
# CONJUNTOS
# ==========================================================
from .conjuntos import (
    garantir_conjuntos_padrao,
    obter_conjunto_por_nome,
    obter_ou_criar_conjunto,
    obter_ou_criar_conjunto_por_nome,
    listar_conjuntos_projeto,
    normalizar_ordem_conjuntos,
)


# ==========================================================
# ORQUESTRADOR
# ==========================================================
from .orquestrador import (
    ResultadoOrquestracaoSugestoes,
    gerar_sugestoes_carga,
    gerar_sugestoes_projeto,
    regerar_sugestoes_projeto,
)


# ==========================================================
# VALIDAÇÕES
# ==========================================================
from .validacoes import (
    listar_sugestoes_pendentes,
    pode_avancar_wizard_5,
    projeto_tem_sugestoes_pendentes,
    quantidade_sugestoes_pendentes,
    resumo_pendencias_projeto,
)

__all__ = [
    # Aprovações
    "aprovar_sugestao",
    "aprovar_sugestoes_projeto",
    "rejeitar_sugestao",
    "rejeitar_sugestoes_projeto",

    # Conjuntos
    "garantir_conjuntos_padrao",
    "obter_conjunto_por_nome",
    "obter_ou_criar_conjunto",
    "obter_ou_criar_conjunto_por_nome",
    "listar_conjuntos_projeto",
    "normalizar_ordem_conjuntos",
    
    # Orquestrador
    "ResultadoOrquestracaoSugestoes",
    "gerar_sugestoes_carga",
    "gerar_sugestoes_projeto",
    "regerar_sugestoes_projeto",

    # Validações
    "listar_sugestoes_pendentes",
    "pode_avancar_wizard_5",
    "projeto_tem_sugestoes_pendentes",
    "quantidade_sugestoes_pendentes",
    "resumo_pendencias_projeto",
]