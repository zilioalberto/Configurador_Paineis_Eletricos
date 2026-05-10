import type { ContatoParceiroDto, ParceiroComercialDto } from '@/modules/cadastros/types/cadastros'

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
  tipo: 'PRODUTO' | 'SERVICO'
  origem: 'MANUAL' | 'CONFIGURADOR'
  descricao: string
  quantidade: string
  custo_unitario: string
  margem_percentual: string
  preco_unitario: string
}

export type OrcamentoDto = {
  id: string
  codigo: string
  titulo: string
  descricao: string
  cliente: string | null
  cliente_nome: string
  contato_cliente: string | null
  contato_cliente_nome: string
  contato_cliente_email: string
  cliente_referencia: string
  margem_produtos_percentual: string
  margem_servicos_percentual: string
  status: string
  valido_ate: string | null
  criado_em: string
  atualizado_em: string
  itens: OrcamentoItemDto[]
}

export type ParceiroClienteDto = ParceiroComercialDto

export type ContatoClienteDto = ContatoParceiroDto

export type ConfiguracaoMargemClienteDto = {
  id: string
  cliente: string
  cliente_nome: string
  margem_produtos_percentual: string
  margem_servicos_percentual: string
}

export type ParametroConfiguracaoDto = {
  id: number
  chave: string
  valor: string
  descricao: string
  atualizado_em: string
}
