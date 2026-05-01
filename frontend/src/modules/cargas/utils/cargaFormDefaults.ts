import type {
  CargaFormData,
  CargaMotorPayload,
  CargaResistenciaPayload,
  CargaSensorPayload,
  CargaTransdutorPayload,
  CargaValvulaPayload,
  TipoCarga,
} from '../types/carga'

export const tipoCargaOptions: { value: TipoCarga; label: string }[] = [
  { value: 'MOTOR', label: 'Motor' },
  { value: 'VALVULA', label: 'Válvula' },
  { value: 'RESISTENCIA', label: 'Resistência' },
  { value: 'SENSOR', label: 'Sensor' },
  { value: 'TRANSDUTOR', label: 'Transdutor' },
  { value: 'TRANSMISSOR', label: 'Transmissor' },
  { value: 'OUTRO', label: 'Outro' },
]

export function defaultMotor(): CargaMotorPayload {
  return {
    potencia_corrente_valor: '1.00',
    potencia_corrente_unidade: 'CV',
    numero_fases: 3,
    tensao_motor: 380,
    rendimento_percentual: '85.00',
    fator_potencia: '0.85',
    tipo_partida: 'DIRETA',
    tipo_protecao: 'DISJUNTOR_MOTOR',
    reversivel: false,
    freio_motor: false,
    tipo_conexao_painel: 'CONEXAO_BORNES_COM_PE',
  }
}

export function defaultValvula(): CargaValvulaPayload {
  return {
    tipo_valvula: 'SOLENOIDE',
    quantidade_vias: '',
    quantidade_posicoes: '',
    quantidade_solenoides: 1,
    retorno_mola: false,
    possui_feedback: false,
    tensao_alimentacao: 24,
    tipo_corrente: 'CC',
    corrente_consumida_ma: '200.00',
    tipo_protecao: 'BORNE_FUSIVEL',
    tipo_acionamento: 'SOLENOIDE_DIRETO',
    tipo_rele_interface: '',
  }
}

export function defaultResistencia(): CargaResistenciaPayload {
  return {
    numero_fases: 3,
    tensao_resistencia: 380,
    tipo_protecao: 'FUSIVEL_ULTRARRAPIDO',
    tipo_acionamento: 'RELE_ESTADO_SOLIDO',
    tipo_rele_interface: '',
    potencia_kw: '1.00',
  }
}

export function defaultSensor(): CargaSensorPayload {
  return {
    tipo_sensor: 'INDUTIVO',
    tipo_sinal: 'DIGITAL',
    tipo_sinal_analogico: '',
    tensao_alimentacao: 24,
    tipo_corrente: 'CC',
    corrente_consumida_ma: '20.00',
    quantidade_fios: '',
    pnp: false,
    npn: false,
    normalmente_aberto: false,
    normalmente_fechado: false,
  }
}

export function defaultTransdutor(): CargaTransdutorPayload {
  return {
    tipo_transdutor: 'PRESSAO',
    faixa_medicao: '',
    tipo_sinal_analogico: 'CORRENTE_4_20MA',
    tensao_alimentacao: 24,
    tipo_corrente: 'CC',
    corrente_consumida_ma: '20.00',
    quantidade_fios: '',
  }
}

export function emptyNestedForTipo(tipo: TipoCarga): Pick<
  CargaFormData,
  'motor' | 'valvula' | 'resistencia' | 'sensor' | 'transdutor'
> {
  return {
    motor: tipo === 'MOTOR' ? defaultMotor() : null,
    valvula: tipo === 'VALVULA' ? defaultValvula() : null,
    resistencia: tipo === 'RESISTENCIA' ? defaultResistencia() : null,
    sensor: tipo === 'SENSOR' ? defaultSensor() : null,
    transdutor: tipo === 'TRANSDUTOR' ? defaultTransdutor() : null,
  }
}

export function cargaFormInitial(projetoId: string): CargaFormData {
  return {
    projeto: projetoId,
    tag: '',
    descricao: '',
    tipo: 'MOTOR',
    quantidade: 1,
    local_instalacao: '',
    observacoes: '',
    exige_comando: false,
    quantidade_entradas_digitais: 0,
    quantidade_entradas_analogicas: 0,
    quantidade_saidas_digitais: 0,
    quantidade_saidas_analogicas: 0,
    quantidade_entradas_rapidas: 0,
    ativo: true,
    ...emptyNestedForTipo('MOTOR'),
  }
}

/** Ao mudar o tipo, reaplica defaults nos blocos específicos (mantém tag, descrição, projeto, etc.). */
export function applyTipoChange(
  prev: CargaFormData,
  novoTipo: TipoCarga
): CargaFormData {
  return {
    ...prev,
    tipo: novoTipo,
    ...emptyNestedForTipo(novoTipo),
  }
}
