from .seccionadoras import gerar_sugestao_seccionamento
from .contatoras import gerar_sugestoes_contatoras
from .disjuntores_motor import gerar_sugestoes_disjuntores_motor
from .rele_sobrecarga import gerar_sugestoes_reles_sobrecarga
from .fusivel import gerar_sugestoes_fusiveis
from .minidisjuntores import (
    gerar_sugestoes_minidisjuntores,
    processar_sugestao_minidisjuntores_para_carga,
    reprocessar_minidisjuntores_para_carga,
)
from .soft_starter import (
    gerar_sugestoes_soft_starters,
    processar_sugestao_soft_starter_para_carga,
    reprocessar_soft_starter_para_carga,
)
from .inversores_frequencia import (
    gerar_sugestoes_inversores_frequencia,
    processar_sugestao_inversores_frequencia_para_carga,
    reprocessar_inversores_frequencia_para_carga,
)
from .reles_estado_solido import (
    gerar_sugestoes_reles_estado_solido,
    processar_sugestao_rele_estado_solido_para_carga,
    reprocessar_rele_estado_solido_para_carga,
)
from .reles_interface import (
    gerar_sugestoes_reles_interface,
    processar_sugestao_rele_interface_para_carga,
    reprocessar_rele_interface_para_carga,
)
from .bornes import (
    gerar_sugestoes_bornes,
    processar_sugestao_bornes_para_carga,
    reprocessar_bornes_para_carga,
)
from .orquestrador import (
    gerar_sugestoes_painel,
    limpar_sugestoes_projeto,
    projeto_precisa_contatoras,
    projeto_tem_motor_com_fusivel,
    projeto_tem_motor_com_rele_sobrecarga,
    projeto_tem_motor_inversor_frequencia,
    projeto_tem_motor_soft_starter_trifasico,
    projeto_tem_resistencia_com_rele_estado_solido,
    projeto_tem_carga_com_rele_interface,
)
from .pendencias_sem_regra import sincronizar_pendencias_cargas_sem_regra_catalogo
from .orquestrador_pendencias import reavaliar_pendencias_projeto
from .aprovacao_sugestoes import aprovar_sugestao_item, aprovar_sugestoes



__all__ = [
    "gerar_sugestao_seccionamento",
    "gerar_sugestoes_contatoras",
    "gerar_sugestoes_disjuntores_motor",
    "gerar_sugestoes_reles_sobrecarga",
    "gerar_sugestoes_fusiveis",
    "gerar_sugestoes_minidisjuntores",
    "processar_sugestao_minidisjuntores_para_carga",
    "reprocessar_minidisjuntores_para_carga",
    "gerar_sugestoes_soft_starters",
    "processar_sugestao_soft_starter_para_carga",
    "reprocessar_soft_starter_para_carga",
    "gerar_sugestoes_inversores_frequencia",
    "processar_sugestao_inversores_frequencia_para_carga",
    "reprocessar_inversores_frequencia_para_carga",
    "gerar_sugestoes_reles_estado_solido",
    "processar_sugestao_rele_estado_solido_para_carga",
    "reprocessar_rele_estado_solido_para_carga",
    "gerar_sugestoes_reles_interface",
    "processar_sugestao_rele_interface_para_carga",
    "reprocessar_rele_interface_para_carga",
    "gerar_sugestoes_bornes",
    "processar_sugestao_bornes_para_carga",
    "reprocessar_bornes_para_carga",
    "aprovar_sugestao_item",
    "aprovar_sugestoes",

    "gerar_sugestoes_painel",
    "reavaliar_pendencias_projeto",
    "limpar_sugestoes_projeto",
    "projeto_precisa_contatoras",
    "projeto_tem_motor_com_fusivel",
    "projeto_tem_motor_com_rele_sobrecarga",
    "projeto_tem_motor_soft_starter_trifasico",
    "projeto_tem_motor_inversor_frequencia",
    "projeto_tem_resistencia_com_rele_estado_solido",
    "projeto_tem_carga_com_rele_interface",
    "sincronizar_pendencias_cargas_sem_regra_catalogo",
]
