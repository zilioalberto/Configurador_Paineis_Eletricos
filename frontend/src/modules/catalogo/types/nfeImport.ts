import type { ObjetivoEntradaFiscal } from '@/modules/fiscal/types/documentoFiscalRecebido'

/** Tipos do fluxo de importação de NF-e para o catálogo. */

export type NfeEmitentePreview = {
  cnpj: string
  cpf?: string
  /** Presente no snapshot devolvido pelo parser (CNPJ ou CPF só com dígitos). */
  documento_original?: string
  razao_social: string
  nome_fantasia: string
  inscricao_estadual: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  tipo_documento: string
  cadastro_fornecedor_disponivel: boolean
}

export type NfeImpostoPreview = Record<string, string>

/** Resumo do produto já cadastrado (preview / GET produto-resumo). */
export type NfeProdutoExistenteResumo = {
  id: string
  codigo: string
  descricao: string
  categoria: string
  unidade_medida: string
  unidade_tributavel: string
  custo_referencia: string
  ncm: string
  cest: string
  gtin: string
  origem_mercadoria: string
  referencia_fabricante: string
  fabricante_parceiro_nome: string
  aliquota_ipi: string
  fabricante_parceiro_id: string
  fornecedor_parceiro_id: string
}

export type NfeItemPreview = {
  n_item: number
  c_prod: string
  x_prod: string
  ncm: string
  cest: string
  c_ean: string
  u_com: string
  unidade_catalogo: string
  /** Unidade tributável mapeada para o catálogo (quando o XML traz `uTrib`). */
  u_trib_catalogo?: string
  q_com: string
  v_un_com: string
  cfop: string
  /** Tributos extraídos do bloco `imposto` da linha da NF-e. */
  imposto?: NfeImpostoPreview
  /** Preenchido no preview quando já existe produto com o mesmo código do XML. */
  produto_existente?: NfeProdutoExistenteResumo | null
}

export type NfeSnapshot = {
  identificacao: {
    chave: string
    numero: string
    serie: string
    data_emissao: string
  }
  emitente: NfeEmitentePreview
  itens: NfeItemPreview[]
}

export type NfePreviewResponse = {
  snapshot: NfeSnapshot
  fornecedor_catalogo: { id: string; razao_social: string; cnpj: string } | null
}

export type NfeFornecedorOption = {
  id: string
  razao_social: string
  cnpj: string
}

export type NfeAplicarItem = {
  n_item: number
  importar: boolean
  criar_fornecedor?: boolean
  fornecedor_id?: string
  criar_fabricante?: boolean
  fabricante_id?: string
  categoria_catalogo?: string
  codigo_catalogo?: string
  /** Se o código já existe e há divergência, marque para sobrescrever campos com o XML. */
  atualizar_se_existir?: boolean
}

export type NfeAplicarPayload = {
  snapshot: NfeSnapshot
  criar_fornecedor?: boolean
  fornecedor_id?: string
  categoria_padrao?: string
  objetivo_entrada?: ObjetivoEntradaFiscal
  itens: NfeAplicarItem[]
}

export type NfeAplicarResponse = {
  fornecedor_id: string | null
  fornecedor_criado: boolean
  fornecedor_ids?: string[]
  fornecedores_associados?: NfeFornecedorOption[]
  produtos_criados: string[]
  produtos_atualizados: string[]
  produtos_ignorados: Array<{ n_item: number; codigo?: string; motivo: string }>
  avisos: string[]
}
