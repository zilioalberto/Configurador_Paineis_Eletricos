/** Valores de `CategoriaProdutoNomeChoices` (API: id === nome). */
export type CategoriaProdutoNome =
  | 'CONTATORA'
  | 'DISJUNTOR_MOTOR'
  | 'DISJUNTOR_CAIXA_MOLDADA'
  | 'MINIDISJUNTOR'
  | 'RELE_SOBRECARGA'
  | 'SECCIONADORA'
  | 'FUSIVEL'
  | 'RELE_ESTADO_SOLIDO'
  | 'INVERSOR_FREQUENCIA'
  | 'SOFT_STARTER'
  | 'BOTAO'
  | 'CHAVE_SELETORA'
  | 'SINALIZADOR'
  | 'RELE_INTERFACE'
  | 'TEMPORIZADOR'
  | 'CONTROLADOR_TEMPERATURA'
  | 'PLC'
  | 'EXPANSAO_PLC'
  | 'IHM'
  | 'MODULO_COMUNICACAO'
  | 'GATEWAY'
  | 'SWITCH_REDE'
  | 'FONTE_CHAVEADA'
  | 'BORNE'
  | 'BARRAMENTO'
  | 'CABO'
  | 'CANALETA'
  | 'TRILHO_DIN'
  | 'PAINEL'
  | 'CLIMATIZACAO'
  | 'SEM_REGRA_SUGESTAO_AUTOMATICA'

/** Opção de categoria (API: id === nome, valor fixo das choices). */
export type CategoriaProduto = {
  id: string
  nome: CategoriaProdutoNome
  nome_display?: string
  descricao?: string
  ativo?: boolean
  criado_em?: string
  atualizado_em?: string
}
