export type CnaeCnpjDto = {
  codigo: string
  descricao: string
  principal: boolean
}

export type SocioCnpjDto = {
  nome: string
  qualificacao: string
  data_entrada: string | null
  faixa_etaria: string
}

export type EnderecoCnpjDto = {
  nome: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  principal: boolean
}

/** Resposta de `GET /cadastros/cnpj/:cnpj/` (preview Receita). */
export type CnpjConsultaDto = {
  documento: string
  razao_social: string
  nome_fantasia: string
  email: string
  telefone: string
  situacao_cadastral: string
  situacao_cadastral_codigo: number | null
  data_inicio_atividade: string | null
  capital_social: string | null
  cnae_fiscal: string
  cnae_fiscal_descricao: string
  natureza_juridica: string
  matriz_filial: string
  endereco: EnderecoCnpjDto | null
  cnaes: CnaeCnpjDto[]
  socios: SocioCnpjDto[]
  consultado_em: string
  ja_cadastrado: boolean
  parceiro_existente_id?: string
  parceiro_existente_nome?: string
  parceiro_existente_eh_cliente?: boolean
  parceiro_existente_eh_fornecedor?: boolean
  parceiro_existente_eh_parceiro?: boolean
}

export type CnpjAtualizarPayload = CnpjSalvarPayload & {
  parceiro_id: string
}

export type CnpjSalvarPayload = {
  eh_cliente: boolean
  eh_fornecedor: boolean
  eh_parceiro: boolean
  inscricao_estadual?: string
  email?: string
  telefone?: string
  razao_social?: string
  nome_fantasia?: string
}
