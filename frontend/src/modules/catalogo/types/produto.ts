import type { CategoriaProdutoNome } from './categoria'

export type UnidadeMedidaProduto = 'UN' | 'MT' | 'CJ'

/** Estado editável da especificação da categoria atual (uma entrada por campo do modelo). */
export type EspecificacaoFormState = Record<string, string | number | boolean>

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
  /** Campos da especificação OneToOne correspondentes à categoria selecionada. */
  especificacao: EspecificacaoFormState | null
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
}
