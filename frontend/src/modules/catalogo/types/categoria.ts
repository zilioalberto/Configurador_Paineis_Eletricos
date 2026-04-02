export type CategoriaProdutoNome =
  | 'CONTATORA'
  | 'DISJUNTOR_MOTOR'
  | 'RELE_SOBRECARGA'
  | 'MINI_DISJUNTOR'
  | 'SECCIONADORA'
  | 'FONTE'
  | 'PLC'
  | 'EXPANSAO_PLC'
  | 'BORNE'
  | 'CABO'
  | 'CANALETA'
  | 'PAINEL'
  | 'CLIMATIZACAO'
  | 'OUTROS'

export type CategoriaProduto = {
  id: string
  nome: CategoriaProdutoNome
  nome_display?: string
  descricao: string
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}
