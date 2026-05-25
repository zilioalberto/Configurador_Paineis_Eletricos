/**
 * Tipos do shell ERP: orçamentos, metadados de módulos e parâmetros de configuração.
 */
import type { ContatoParceiroDto, ParceiroComercialDto } from '@/modules/cadastros/types/cadastros'

/** Metadados de um módulo do roadmap (`GET /erp/modules/:slug/meta/`). */
export type ErpModuleMetaDto = {
  id: string
  area: string
  title: string
  summary: string
  backend_package: string
  notes: string
}

/** Linha de item da proposta comercial. */
export type OrcamentoItemDto = {
  id: string
  ordem: number
  tipo: 'PRODUTO' | 'SERVICO'
  origem: 'MANUAL' | 'CONFIGURADOR' | 'CATALOGO' | 'HERANCA_REVISAO'
  editavel?: boolean
  configurador_painel?: string | null
  item_origem?: string | null
  produto?: string | null
  produto_codigo?: string
  produto_ncm?: string
  descricao: string
  quantidade: string
  custo_unitario: string
  margem_percentual: string
  preco_unitario: string
  aliquota_ipi?: string | null
}

export type OrcamentoConfiguradorPainelDto = {
  id: string
  ordem: number
  descricao_painel: string
  modo: 'ATIVO' | 'HERANCA_HISTORICA'
  projeto_configurador_id: string | null
  projeto_configurador_codigo: string
  projeto_configurador_origem_id: string | null
  configurador_painel_origem_id: string | null
  pendencias_abertas?: number
  sincronizado_em: string | null
  criado_em: string
  atualizado_em: string
}

/** Orçamento/proposta com cabeçalho, cliente e itens. */
export type OrcamentoDto = {
  id: string
  codigo: string
  codigo_base: string
  revisao: string
  tipo_revisao: 'INICIAL' | 'COMERCIAL' | 'TECNICA'
  orcamento_origem: string | null
  editavel?: boolean
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
  configuradores_painel?: OrcamentoConfiguradorPainelDto[]
}

export type ParceiroClienteDto = ParceiroComercialDto

export type ContatoClienteDto = ContatoParceiroDto

/** Margens padrão de produtos/serviços por cliente. */
export type ConfiguracaoMargemClienteDto = {
  id: string
  cliente: string
  cliente_nome: string
  margem_produtos_percentual: string
  margem_servicos_percentual: string
}

/** Parâmetro chave/valor das configurações globais do ERP. */
export type ParametroConfiguracaoDto = {
  id: number
  chave: string
  valor: string
  descricao: string
  atualizado_em: string
}
