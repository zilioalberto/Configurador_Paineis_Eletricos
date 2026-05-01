import type { CategoriaProdutoNome } from '../types/categoria'

/** Igual a `CATEGORIA_PARA_CAMPO` no backend (`catalogo/api/serializers.py`). */
export const CATEGORIA_PARA_ESPEC_KEY: Partial<Record<CategoriaProdutoNome, string>> = {
  CONTATORA: 'especificacao_contatora',
  DISJUNTOR_MOTOR: 'especificacao_disjuntor_motor',
  SECCIONADORA: 'especificacao_seccionadora',
  DISJUNTOR_CAIXA_MOLDADA: 'especificacao_disjuntor_caixa_moldada',
  RELE_SOBRECARGA: 'especificacao_rele_sobrecarga',
  MINIDISJUNTOR: 'especificacao_minidisjuntor',
  RELE_ESTADO_SOLIDO: 'especificacao_rele_estado_solido',
  FUSIVEL: 'especificacao_fusivel',
  FONTE_CHAVEADA: 'especificacao_fonte',
  PLC: 'especificacao_plc',
  EXPANSAO_PLC: 'especificacao_expansao_plc',
  BORNE: 'especificacao_borne',
  CABO: 'especificacao_cabo',
  CANALETA: 'especificacao_canaleta',
  PAINEL: 'especificacao_painel',
  CLIMATIZACAO: 'especificacao_climatizacao',
  INVERSOR_FREQUENCIA: 'especificacao_inversor_frequencia',
  SOFT_STARTER: 'especificacao_soft_starter',
  RELE_INTERFACE: 'especificacao_rele_interface',
  IHM: 'especificacao_ihm',
  SWITCH_REDE: 'especificacao_switch_rede',
  MODULO_COMUNICACAO: 'especificacao_modulo_comunicacao',
  BOTAO: 'especificacao_botao',
  CHAVE_SELETORA: 'especificacao_chave_seletora',
  SINALIZADOR: 'especificacao_sinalizador',
  TEMPORIZADOR: 'especificacao_temporizador',
  CONTROLADOR_TEMPERATURA: 'especificacao_controlador_temperatura',
  TRILHO_DIN: 'especificacao_trilho_din',
  BARRAMENTO: 'especificacao_barramento',
  GATEWAY: 'especificacao_gateway',
}

export function getEspecApiKey(
  nome: CategoriaProdutoNome | string | undefined
): string | undefined {
  if (!nome) return undefined
  return CATEGORIA_PARA_ESPEC_KEY[nome as CategoriaProdutoNome]
}
