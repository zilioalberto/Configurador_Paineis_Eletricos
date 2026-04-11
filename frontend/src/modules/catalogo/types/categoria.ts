export type CategoriaProdutoNome =
  | 'CONTATORA'
  | 'DISJUNTOR_MOTOR'
  | 'RELE_SOBRECARGA'
  | 'MINI_DISJUNTOR'
  | 'SECCIONADORA'
  | 'DISJUNTOR_CAIXA_MOLDADA'
  | 'FONTE'
  | 'PLC'
  | 'EXPANSAO_PLC'
  | 'BORNE'
  | 'CABO'
  | 'CANALETA'
  | 'PAINEL'
  | 'CLIMATIZACAO'
  | 'OUTROS'

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
