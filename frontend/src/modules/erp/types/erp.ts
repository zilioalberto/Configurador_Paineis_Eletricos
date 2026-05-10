export type ErpModuleMetaDto = {
  id: string
  area: string
  title: string
  summary: string
  backend_package: string
  notes: string
}

export type OrcamentoItemDto = {
  id: string
  ordem: number
  descricao: string
  quantidade: string
  preco_unitario: string
}

export type OrcamentoDto = {
  id: string
  codigo: string
  titulo: string
  descricao: string
  cliente_referencia: string
  status: string
  valido_ate: string | null
  criado_em: string
  atualizado_em: string
  itens: OrcamentoItemDto[]
}

export type ParametroConfiguracaoDto = {
  id: number
  chave: string
  valor: string
  descricao: string
  atualizado_em: string
}
