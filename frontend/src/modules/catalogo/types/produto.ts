import type { CategoriaProdutoNome } from './categoria'

export type UnidadeMedidaProduto = 'UN' | 'MT' | 'CJ'

export type EspecificacaoContatoraForm = {
  corrente_ac3_a: string
  corrente_ac1_a: string
  tensao_bobina_v: number
  tipo_corrente_bobina: 'CA' | 'CC'
  contatos_aux_na: number
  contatos_aux_nf: number
  modo_montagem: string
}

export type EspecificacaoDisjuntorMotorForm = {
  faixa_ajuste_min_a: string
  faixa_ajuste_max_a: string
  contatos_aux_na: number
  contatos_aux_nf: number
  modo_montagem: string
}

export type EspecificacaoSeccionadoraForm = {
  corrente_ac1_a: string
  corrente_ac3_a: string
  tipo_montagem: string
  tipo_fixacao: string
  cor_manopla: string
}

export type ProdutoFormData = {
  codigo: string
  descricao: string
  categoria: string
  unidade_medida: UnidadeMedidaProduto
  valor_unitario: string
  fabricante: string
  referencia_fabricante: string
  largura_mm: string
  altura_mm: string
  profundidade_mm: string
  observacoes_tecnicas: string
  ativo: boolean
  especificacao_contatora: EspecificacaoContatoraForm | null
  especificacao_disjuntor_motor: EspecificacaoDisjuntorMotorForm | null
  especificacao_seccionadora: EspecificacaoSeccionadoraForm | null
}

export type ProdutoListItem = {
  id: string
  codigo: string
  descricao: string
  categoria: string
  categoria_nome?: CategoriaProdutoNome
  categoria_display?: string
  fabricante: string
  unidade_medida: string
  unidade_medida_display?: string
  valor_unitario: string
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

export type ProdutoDetail = ProdutoListItem & {
  referencia_fabricante?: string
  largura_mm?: string | null
  altura_mm?: string | null
  profundidade_mm?: string | null
  observacoes_tecnicas?: string
  especificacao_contatora?: Record<string, unknown> | null
  especificacao_disjuntor_motor?: Record<string, unknown> | null
  especificacao_seccionadora?: Record<string, unknown> | null
}
