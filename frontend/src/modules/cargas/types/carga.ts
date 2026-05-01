export type TipoCarga =
  | 'MOTOR'
  | 'VALVULA'
  | 'RESISTENCIA'
  | 'SENSOR'
  | 'TRANSDUTOR'
  | 'TRANSMISSOR'
  | 'OUTRO'

export type CargaMotorPayload = {
  potencia_corrente_valor: string
  potencia_corrente_unidade: 'CV' | 'KW' | 'A'
  numero_fases: number
  tensao_motor: number
  rendimento_percentual: string
  fator_potencia: string
  tipo_partida: string
  tipo_protecao: string
  reversivel: boolean
  freio_motor: boolean
  tipo_conexao_painel: string
}

export type CargaValvulaPayload = {
  tipo_valvula: string
  quantidade_vias: string
  quantidade_posicoes: string
  quantidade_solenoides: number
  retorno_mola: boolean
  possui_feedback: boolean
  tensao_alimentacao: number
  tipo_corrente: 'CA' | 'CC'
  corrente_consumida_ma: string
  tipo_protecao: string
  tipo_acionamento: string
  /** Preenchido quando `tipo_acionamento` é `RELE_INTERFACE`. */
  tipo_rele_interface: string
}

export type CargaResistenciaPayload = {
  numero_fases: number
  tensao_resistencia: number
  tipo_protecao: string
  tipo_acionamento: string
  /** Preenchido quando `tipo_acionamento` é `RELE_INTERFACE`. */
  tipo_rele_interface: string
  potencia_kw: string
}

export type CargaSensorPayload = {
  tipo_sensor: string
  tipo_sinal: string
  tipo_sinal_analogico: string
  tensao_alimentacao: number
  tipo_corrente: 'CA' | 'CC'
  corrente_consumida_ma: string
  quantidade_fios: number | ''
  pnp: boolean
  npn: boolean
  normalmente_aberto: boolean
  normalmente_fechado: boolean
}

export type CargaTransdutorPayload = {
  tipo_transdutor: string
  faixa_medicao: string
  tipo_sinal_analogico: string
  tensao_alimentacao: number
  tipo_corrente: 'CA' | 'CC'
  corrente_consumida_ma: string
  quantidade_fios: number | ''
}

export type CargaFormData = {
  projeto: string
  tag: string
  descricao: string
  tipo: TipoCarga
  quantidade: number
  local_instalacao: string
  observacoes: string
  exige_comando: boolean
  quantidade_entradas_digitais: number
  quantidade_entradas_analogicas: number
  quantidade_saidas_digitais: number
  quantidade_saidas_analogicas: number
  quantidade_entradas_rapidas: number
  ativo: boolean
  motor: CargaMotorPayload | null
  valvula: CargaValvulaPayload | null
  resistencia: CargaResistenciaPayload | null
  sensor: CargaSensorPayload | null
  transdutor: CargaTransdutorPayload | null
}

export type CargaModelo = {
  id: string
  nome: string
  tipo: TipoCarga
  payload: Record<string, unknown>
  ativo: boolean
}

export type CargaListItem = {
  id: string
  projeto: string
  projeto_codigo?: string
  projeto_nome?: string
  tag: string
  descricao: string
  tipo: TipoCarga
  tipo_display?: string
  projeto_tensao_display?: string
  projeto_fases_display?: string
  projeto_tipo_corrente_display?: string
  tipo_corrente_carga_display?: string | null
  fases_carga_display?: string | null
  corrente_calculada_a?: string | null
  potencia_corrente_valor?: string | null
  potencia_corrente_unidade?: string | null
  tensao_carga_display?: string | null
  quantidade: number
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

/** Resposta GET detalhada da API. */
export type CargaDetail = {
  id: string
  projeto: string
  projeto_codigo?: string
  projeto_nome?: string
  tag: string
  descricao: string
  tipo: TipoCarga
  tipo_display?: string
  quantidade: number
  local_instalacao?: string
  observacoes?: string
  exige_protecao?: boolean
  exige_seccionamento?: boolean
  exige_comando?: boolean
  quantidade_entradas_digitais?: number
  quantidade_entradas_analogicas?: number
  quantidade_saidas_digitais?: number
  quantidade_saidas_analogicas?: number
  quantidade_entradas_rapidas?: number
  ativo?: boolean
  criado_em?: string
  atualizado_em?: string
  motor?: Partial<CargaMotorPayload> & {
    potencia_kw_calculada?: string | null
    corrente_calculada_a?: string | null
  }
  valvula?: Partial<CargaValvulaPayload>
  resistencia?: Partial<CargaResistenciaPayload>
  sensor?: Partial<CargaSensorPayload>
  transdutor?: Partial<CargaTransdutorPayload>
}
