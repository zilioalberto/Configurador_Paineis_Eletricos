/**
 * Tipos de produto do catálogo (formulário, listagem, detalhe e dados fiscais).
 */

import type { CategoriaProdutoNome } from './categoria'
import type { UnidadeMedidaProduto } from '../constants/catalogoChoiceOptions'
import type { ObjetivoEntradaFiscal } from '@/modules/fiscal/types/documentoFiscalRecebido'

/** Item fiscal persistido (`apps.fiscal.models.ItemFiscalProduto`) — detalhe/listagem, não editável neste formulário. */
export type ItemFiscalProduto = {
  id: string
  criado_em?: string
  atualizado_em?: string
  ordem: number
  rotulo: string
  cfop: string
  objetivo_entrada: ObjetivoEntradaFiscal
  origem_mercadoria: string | null
  cst_icms: string
  csosn: string
  icms_grupo_xml: string
  mod_bc_icms: string
  v_bc_icms: string | number | null
  p_icms: string | number | null
  v_icms: string | number | null
  cst_ipi: string
  v_bc_ipi: string | number | null
  p_ipi: string | number | null
  v_ipi: string | number | null
  cst_pis: string
  v_bc_pis: string | number | null
  p_pis: string | number | null
  v_pis: string | number | null
  cst_cofins: string
  v_bc_cofins: string | number | null
  p_cofins: string | number | null
  v_cofins: string | number | null
  n_item_nfe: number | null
}

export type ProdutoInformacaoComercial = {
  gtin?: string
  ncm?: string
  cest?: string
  origem_mercadoria?: string
  unidade_tributavel?: string
  codigo_perfil_fiscal?: string
  peso_liquido_kg?: string | null
  peso_bruto_kg?: string | null
  criado_em?: string
  atualizado_em?: string
}

export type ProdutoAcessorioCompativelForm = {
  acessorio: string
  acessorio_codigo?: string
  acessorio_descricao?: string
  tipo_acessorio: string
  quantidade_padrao: string
  prioridade: number
  observacoes: string
}

/** Estado editável da especificação da categoria atual (uma entrada por campo do modelo). */
export type EspecificacaoFormState = Record<string, string | number | boolean>

export type ProdutoFormData = {
  codigo: string
  descricao: string
  categoria: string
  unidade_medida: UnidadeMedidaProduto
  custo_referencia: string
  /** Alíquota IPI (%) de referência, ao lado do custo de referência. */
  aliquota_ipi: string
  /** UUID do parceiro fabricante ou vazio. */
  fabricante_parceiro: string
  fabricante_parceiro_nome: string
  fabricante_parceiro_documento: string
  /** UUID do parceiro fornecedor importado/vinculado ou vazio. */
  fornecedor_parceiro: string
  fornecedor_parceiro_nome: string
  fornecedor_parceiro_documento: string
  referencia_fabricante: string
  largura_mm: string
  altura_mm: string
  profundidade_mm: string
  observacoes_tecnicas: string
  ativo: boolean
  /** Campos da especificação OneToOne correspondentes à categoria selecionada. */
  especificacao: EspecificacaoFormState | null
  /** Acessórios explicitamente compatíveis, usado hoje para bornes. */
  acessorios_compativeis: ProdutoAcessorioCompativelForm[]
}

export type ProdutoListItem = {
  id: string
  codigo: string
  descricao: string
  categoria: string
  categoria_nome?: CategoriaProdutoNome
  categoria_display?: string
  unidade_medida: string
  unidade_medida_display?: string
  custo_referencia: string
  custo_atualizado_em?: string | null
  aliquota_ipi?: string | null
  fabricante_parceiro?: string | null
  fabricante_parceiro_nome?: string | null
  fabricante_parceiro_documento?: string | null
  fornecedor_parceiro?: string | null
  fornecedor_parceiro_nome?: string | null
  fornecedor_parceiro_documento?: string | null
  informacao_comercial?: ProdutoInformacaoComercial | null
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
  itens_fiscais?: ItemFiscalProduto[]
  acessorios_compativeis?: ProdutoAcessorioCompativelForm[]
}
