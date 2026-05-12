export type StatusProjeto =
  | 'EM_ANDAMENTO'
  | 'FINALIZADO'

export type TipoCorrente = 'CA' | 'CC'

export type TipoPainel =
  | 'AUTOMACAO'
  | 'DISTRIBUICAO'

export type TipoSeccionamento =
  | 'NENHUM'
  | 'SECCIONADORA'
  | 'DISJUNTOR_CAIXA_MOLDADA'

export type TipoConexaoAlimentacao =
  | 'BARRAMENTO'
  | 'BORNE'
  | 'TOMADA'
  | 'DIRETO'
  | 'OUTRO'

export type TipoClimatizacaoPainel =
  | 'VENTILADOR'
  | 'EXAUSTOR'
  | 'AR_CONDICIONADO'
  | 'OUTRO'

export interface Projeto {
  id: string
  codigo: string
  nome: string
  descricao: string
  cliente: string

  status: StatusProjeto
  status_display?: string

  tipo_painel: TipoPainel
  tipo_painel_display?: string

  tipo_corrente: TipoCorrente
  tensao_nominal: number
  numero_fases: number | null
  frequencia: number | null

  possui_neutro: boolean
  possui_terra: boolean

  tipo_conexao_alimentacao_potencia: TipoConexaoAlimentacao
  tipo_conexao_alimentacao_potencia_display?: string

  tipo_conexao_alimentacao_neutro: TipoConexaoAlimentacao | null
  tipo_conexao_alimentacao_neutro_display?: string | null

  tipo_conexao_alimentacao_terra: TipoConexaoAlimentacao | null
  tipo_conexao_alimentacao_terra_display?: string | null

  tipo_corrente_comando: TipoCorrente
  tensao_comando: number

  possui_plc: boolean
  familia_plc: string | null
  possui_ihm: boolean
  possui_switches: boolean
  possui_plaqueta_identificacao: boolean
  possui_faixa_identificacao: boolean
  possui_adesivo_alerta: boolean
  possui_adesivos_tensao: boolean

  possui_climatizacao: boolean
  tipo_climatizacao: TipoClimatizacaoPainel | null
  tipo_climatizacao_display?: string | null

  fator_demanda: string

  /** 0 = mínimo normativo (tabela Iz); 1 = uma bitola comercial acima; etc. */
  degraus_margem_bitola_condutores: number

  possui_seccionamento: boolean
  tipo_seccionamento: TipoSeccionamento | null
  tipo_seccionamento_display?: string | null

  ativo?: boolean
  responsavel?: number | null
  responsavel_nome?: string | null
  criado_por?: string | null
  criado_por_nome?: string | null
  atualizado_por?: string | null
  atualizado_por_nome?: string | null
  criado_em?: string
  atualizado_em?: string
}

export interface ProjetoEvento {
  id: string
  projeto: string
  usuario: string | null
  usuario_nome?: string | null
  modulo: string
  acao: string
  descricao: string
  detalhes: Record<string, unknown>
  criado_em: string
}

export interface ProjetoFormData {
  codigo: string
  nome: string
  descricao: string
  cliente: string

  status: StatusProjeto
  tipo_painel: TipoPainel

  tipo_corrente: TipoCorrente
  tensao_nominal: number | ''
  numero_fases: number | null
  frequencia: number | null

  possui_neutro: boolean
  possui_terra: boolean

  tipo_conexao_alimentacao_potencia: TipoConexaoAlimentacao
  tipo_conexao_alimentacao_neutro: TipoConexaoAlimentacao | null
  tipo_conexao_alimentacao_terra: TipoConexaoAlimentacao | null

  tipo_corrente_comando: TipoCorrente
  tensao_comando: number | ''

  possui_plc: boolean
  familia_plc: string | null
  possui_ihm: boolean
  possui_switches: boolean
  possui_plaqueta_identificacao: boolean
  possui_faixa_identificacao: boolean
  possui_adesivo_alerta: boolean
  possui_adesivos_tensao: boolean

  possui_climatizacao: boolean
  tipo_climatizacao: TipoClimatizacaoPainel | null

  fator_demanda: string

  degraus_margem_bitola_condutores: number

  possui_seccionamento: boolean
  tipo_seccionamento: TipoSeccionamento | null
  responsavel: number | null
}

export interface ProjetoResponsavelOption {
  id: number
  label: string
  email: string
  tipo_usuario: string
}