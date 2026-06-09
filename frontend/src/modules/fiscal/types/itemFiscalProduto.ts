/** Linha da API `GET /fiscal/itens-fiscais/` (lista paginada). */
import type { ObjetivoEntradaFiscal } from './documentoFiscalRecebido'

export type ItemFiscalProdutoListRow = {
  id: string
  criado_em: string
  atualizado_em: string
  produto_id: string
  produto_codigo: string
  produto_descricao: string
  ordem: number
  rotulo: string
  cfop: string
  objetivo_entrada: ObjetivoEntradaFiscal
  origem_mercadoria: string | null
  cst_icms: string
  csosn: string
  icms_grupo_xml: string
  mod_bc_icms: string
  v_bc_icms: string | null
  p_icms: string | null
  v_icms: string | null
  cst_ipi: string
  v_bc_ipi: string | null
  p_ipi: string | null
  v_ipi: string | null
  cst_pis: string
  v_bc_pis: string | null
  p_pis: string | null
  v_pis: string | null
  cst_cofins: string
  v_bc_cofins: string | null
  p_cofins: string | null
  v_cofins: string | null
  n_item_nfe: number | null
}
