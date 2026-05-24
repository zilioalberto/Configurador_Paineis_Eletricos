/**
 * Tipos e payloads da API de cadastros (parceiros, endereços, contatos).
 */

export type TipoPessoaParceiro = 'PJ' | 'PF' | 'EX'

export type OrigemCadastroParceiro = 'MANUAL' | 'NFE' | 'IMPORTACAO'

export type ParceiroTipoFiltro = '' | 'cliente' | 'fornecedor' | 'parceiro'

export type ParceiroAtivoFiltro = '' | '1' | '0'

export type EnderecoParceiroDto = {
  id: string
  parceiro: string
  nome: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  principal: boolean
  criado_em?: string
  atualizado_em?: string
}

export type ContatoParceiroDto = {
  id: string
  parceiro: string
  nome: string
  cargo: string
  email: string
  telefone: string
  principal: boolean
  observacoes: string
  criado_em?: string
  atualizado_em?: string
}

export type ParceiroComercialDto = {
  id: string
  tipo_pessoa: TipoPessoaParceiro
  documento: string
  razao_social: string
  nome_fantasia: string
  inscricao_estadual: string
  email: string
  telefone: string
  eh_cliente: boolean
  eh_fornecedor: boolean
  eh_parceiro: boolean
  ativo: boolean
  origem: OrigemCadastroParceiro
  enderecos: EnderecoParceiroDto[]
  contatos: ContatoParceiroDto[]
  criado_em?: string
  atualizado_em?: string
}

export type ParceiroComercialPayload = {
  tipo_pessoa: TipoPessoaParceiro
  documento: string
  razao_social: string
  nome_fantasia?: string
  inscricao_estadual?: string
  email?: string
  telefone?: string
  eh_cliente: boolean
  eh_fornecedor: boolean
  eh_parceiro: boolean
  ativo: boolean
  origem?: OrigemCadastroParceiro
}

export type ContatoParceiroPayload = {
  parceiro: string
  nome: string
  cargo?: string
  email?: string
  telefone?: string
  principal: boolean
  observacoes?: string
}

export type EnderecoParceiroPayload = {
  parceiro: string
  nome?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  principal: boolean
}

export type ParceiroListFilters = {
  tipo?: ParceiroTipoFiltro
  ativo?: ParceiroAtivoFiltro
  search?: string
}
