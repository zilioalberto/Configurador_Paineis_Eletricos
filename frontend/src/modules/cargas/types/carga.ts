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
  rendimento_percentual: string
  fator_potencia: string
  tipo_partida: string
  tipo_protecao: string
  reversivel: boolean
  freio_motor: boolean
  tempo_partida_s: string
  tipo_conexao_painel: string
}

export type CargaValvulaPayload = {
  tipo_valvula: string
  quantidade_vias: string
  quantidade_posicoes: string
  retorno_mola: boolean
  possui_feedback: boolean
}

export type CargaResistenciaPayload = {
  controle_em_etapas: boolean
  quantidade_etapas: number
  controle_pid: boolean
}

export type CargaSensorPayload = {
  tipo_sensor: string
  tipo_sinal: string
  tipo_sinal_analogico: string
  pnp: boolean
  npn: boolean
  normalmente_aberto: boolean
  normalmente_fechado: boolean
  range_medicao: string
}

export type CargaTransdutorPayload = {
  tipo_transdutor: string
  faixa_medicao: string
  tipo_sinal_analogico: string
  precisao: string
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
  ocupa_entrada_digital: boolean
  ocupa_entrada_analogica: boolean
  ocupa_saida_digital: boolean
  ocupa_saida_analogica: boolean
  ativo: boolean
  motor: CargaMotorPayload | null
  valvula: CargaValvulaPayload | null
  resistencia: CargaResistenciaPayload | null
  sensor: CargaSensorPayload | null
  transdutor: CargaTransdutorPayload | null
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
  corrente_calculada_a?: string | null
  potencia_corrente_valor?: string | null
  potencia_corrente_unidade?: string | null
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
  exige_fonte_auxiliar?: boolean
  ocupa_entrada_digital?: boolean
  ocupa_entrada_analogica?: boolean
  ocupa_saida_digital?: boolean
  ocupa_saida_analogica?: boolean
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
