from catalogo.selectors._base import (
    CATEGORIA_ESPEC_RELATED,
    filtrar_produtos_especificacao,
    related_name_para_categoria,
)
from catalogo.selectors.barramentos import selecionar_barramentos
from catalogo.selectors.bornes import selecionar_bornes
from catalogo.selectors.botoes import selecionar_botoes
from catalogo.selectors.cabos import selecionar_cabos
from catalogo.selectors.canaletas import selecionar_canaletas
from catalogo.selectors.chaves_seletoras import selecionar_chaves_seletoras
from catalogo.selectors.climatizacoes import selecionar_climatizacoes
from catalogo.selectors.contatoras import selecionar_contatoras
from catalogo.selectors.controladores_temperatura import selecionar_controladores_temperatura
from catalogo.selectors.disjuntores_caixa_moldada import selecionar_disjuntores_caixa_moldada
from catalogo.selectors.disjuntores_motor import selecionar_disjuntores_motor
from catalogo.selectors.expansoes_plc import selecionar_expansoes_plc
from catalogo.selectors.fontes_chaveadas import selecionar_fontes_chaveadas
from catalogo.selectors.fusiveis import selecionar_fusiveis
from catalogo.selectors.gateways import selecionar_gateways
from catalogo.selectors.ihms import selecionar_ihms
from catalogo.selectors.inversores_frequencia import selecionar_inversores_frequencia
from catalogo.selectors.minidisjuntor import selecionar_minidisjuntores
from catalogo.selectors.modulos_comunicacao import selecionar_modulos_comunicacao
from catalogo.selectors.paineis import selecionar_paineis
from catalogo.selectors.plcs import selecionar_plcs
from catalogo.selectors.reles_estado_solido import selecionar_reles_estado_solido
from catalogo.selectors.reles_interface import selecionar_reles_interface
from catalogo.selectors.rele_sobrecarga import selecionar_reles_sobrecarga
from catalogo.selectors.seccionadoras import selecionar_seccionadoras
from catalogo.selectors.sinalizadores import selecionar_sinalizadores
from catalogo.selectors.soft_starters import selecionar_soft_starters
from catalogo.selectors.switches_rede import selecionar_switches_rede
from catalogo.selectors.temporizadores import selecionar_temporizadores
from catalogo.selectors.trilhos_din import selecionar_trilhos_din

__all__ = [
    "CATEGORIA_ESPEC_RELATED",
    "filtrar_produtos_especificacao",
    "related_name_para_categoria",
    "selecionar_barramentos",
    "selecionar_bornes",
    "selecionar_botoes",
    "selecionar_cabos",
    "selecionar_canaletas",
    "selecionar_chaves_seletoras",
    "selecionar_climatizacoes",
    "selecionar_contatoras",
    "selecionar_controladores_temperatura",
    "selecionar_disjuntores_caixa_moldada",
    "selecionar_disjuntores_motor",
    "selecionar_expansoes_plc",
    "selecionar_fontes_chaveadas",
    "selecionar_fusiveis",
    "selecionar_gateways",
    "selecionar_ihms",
    "selecionar_inversores_frequencia",
    "selecionar_minidisjuntores",
    "selecionar_modulos_comunicacao",
    "selecionar_paineis",
    "selecionar_plcs",
    "selecionar_reles_estado_solido",
    "selecionar_reles_interface",
    "selecionar_reles_sobrecarga",
    "selecionar_seccionadoras",
    "selecionar_sinalizadores",
    "selecionar_soft_starters",
    "selecionar_switches_rede",
    "selecionar_temporizadores",
    "selecionar_trilhos_din",
]
