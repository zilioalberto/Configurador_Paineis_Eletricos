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
  painel_ref?: string
  item_origem?: string | null
  produto?: string | null
  produto_codigo?: string
  produto_ncm?: string
  servico?: string | null
  servico_codigo?: string
  servico_unidade_medida?: string
  servico_categoria?: string
  catalogo_preco_atualizado_em?: string | null
  catalogo_preco_desatualizado?: boolean
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

export type OrcamentoSnapshotEnvioDto = {
  id: string
  codigo: string
  status_orcamento: string
  total: string
  gerado_em: string
  gerado_por: number | null
  dados: Record<string, unknown>
  itens: Array<Record<string, unknown>>
}

export type PerfilOferta = 'MATERIAIS' | 'SOLUCAO_COMPLETA'

export type TipoBlocoOferta =
  | 'INTRODUCAO'
  | 'ESCOPO'
  | 'ITENS_FORNECIMENTO'
  | 'SERVICOS'
  | 'EXCLUSOES'
  | 'INVESTIMENTO'
  | 'PRAZO_ENTREGA'
  | 'CONDICOES_PAGAMENTO'
  | 'CONDICOES_GERAIS'
  | 'GARANTIA'
  | 'APROVACAO'
  | 'OBSERVACOES'

export type OrcamentoOfertaBlocoDto = {
  id: string
  ordem: number
  tipo: TipoBlocoOferta
  titulo: string
  conteudo: string
  editavel?: boolean
}

export type OrcamentoPreviewOfertaItemDto = {
  id?: string
  ordem?: number
  tipo?: 'PRODUTO' | 'SERVICO'
  codigo?: string
  descricao: string
  quantidade: string
  preco_unitario: string
  subtotal: string
  unidade?: string
  ncm?: string
}

export type OfertaApendiceLegalSecaoDto = {
  id: string
  titulo: string
  conteudo: string
}

export type OrcamentoPreviewOfertaDto = {
  codigo: string
  /** Número da proposta sem sufixo de revisão (ex.: Prop-06001-26). */
  codigo_base?: string
  revisao?: string
  titulo: string
  perfil_oferta: PerfilOferta
  emissao?: string | null
  cliente: {
    id: string | null
    nome: string
    contato: string
    email: string
    telefone: string
    endereco?: string
    cnpj?: string
  }
  validade: string | null
  secoes: Array<Pick<OrcamentoOfertaBlocoDto, 'tipo' | 'titulo' | 'conteudo'>>
  investimento: {
    modo: 'ITENS_UNITARIOS' | 'CONSOLIDADO' | 'POR_PAINEL'
    titulo: string
    itens: OrcamentoPreviewOfertaItemDto[]
  }
  totais: OrcamentoPreviewTotaisDto
  apendice_legal?: {
    versao: string
    secoes: OfertaApendiceLegalSecaoDto[]
  }
}

export type OrcamentoPreviewTotaisDto = {
  produtos: string
  servicos: string
  subtotal: string
  desconto_ativo: boolean
  desconto_percentual: string
  desconto_valor: string
  impostos_percentual: string
  impostos_valor: string
  total: string
}

export type OrcamentoRevisaoResumoDto = {
  id: string
  codigo: string
  codigo_base: string
  revisao: string
  tipo_revisao: 'INICIAL' | 'COMERCIAL' | 'TECNICA'
  status: string
  titulo: string
  criado_em: string
  atualizado_em: string
  snapshot_envio?: OrcamentoSnapshotEnvioDto | null
}

export type TipoArquivoOferta = 'DOCX_REVISADO' | 'PDF_FINAL' | 'PDF_ASSINADO_CLIENTE'

export type CanalEnvioOferta = 'EMAIL' | 'LINK' | 'MANUAL'

export type OrcamentoOfertaArquivoDto = {
  id: string
  tipo: TipoArquivoOferta
  nome_original: string
  content_type: string
  tamanho_bytes: number
  versao: number
  criado_por: string | null
  criado_por_label: string
  criado_em: string
  download_url: string
}

export type OrcamentoOfertaEnvioDto = {
  id: string
  pdf_final: OrcamentoOfertaArquivoDto
  convite?: string | null
  canal?: CanalEnvioOferta
  link_publico?: string
  email_enviado?: boolean
  email_erro?: string
  destinatario_emails?: string
  destinatario_nome: string
  destinatario_email: string
  assunto: string
  mensagem: string
  enviado_por: string | null
  enviado_por_label: string
  enviado_em: string
}

export type EnviarOfertaClientePayload = {
  destinatario_nome?: string
  destinatario_email?: string
  destinatario_emails?: string[]
  assunto?: string
  mensagem?: string
  enviar_email?: boolean
}

export type OrcamentoDtoComLinkEnvio = OrcamentoDto & {
  link_publico?: string
  email_enviado?: boolean
  email_erro?: string
  destinatario_emails?: string
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
  contato_cliente_telefone: string
  cliente_endereco?: string
  cliente_cnpj?: string
  cliente_referencia: string
  margem_produtos_percentual: string
  margem_servicos_percentual: string
  desconto_comercial_ativo?: boolean
  desconto_percentual?: string
  /** NCM manual na tabela de investimento (perfil solução completa). */
  ncm_investimento?: string
  /** Descrição na tabela de investimento (solução completa). */
  investimento_descricao?: string
  perfil_oferta: PerfilOferta
  status: string
  valido_ate: string | null
  criado_em: string
  atualizado_em: string
  itens: OrcamentoItemDto[]
  oferta_blocos?: OrcamentoOfertaBlocoDto[]
  oferta_arquivos?: OrcamentoOfertaArquivoDto[]
  oferta_envios?: OrcamentoOfertaEnvioDto[]
  configuradores_painel?: OrcamentoConfiguradorPainelDto[]
  snapshot_envio?: OrcamentoSnapshotEnvioDto | null
  revisoes_derivadas?: OrcamentoRevisaoResumoDto[]
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
