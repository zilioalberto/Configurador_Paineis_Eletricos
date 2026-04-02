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
    rendimento_percentual: '85.00',
    fator_potencia: '0.85',
    tipo_partida: 'DIRETA',
    tipo_protecao: 'DISJUNTOR_MOTOR',
    reversivel: false,
    freio_motor: false,
    tempo_partida_s: '',
    tipo_conexao_painel: 'CONEXAO_BORNES_COM_PE',
  }
}

export function defaultValvula(): CargaValvulaPayload {
  return {
    tipo_valvula: 'SOLENOIDE',
    quantidade_vias: '',
    quantidade_posicoes: '',
    retorno_mola: false,
    possui_feedback: false,
  }
}

export function defaultResistencia(): CargaResistenciaPayload {
  return {
    controle_em_etapas: false,
    quantidade_etapas: 1,
    controle_pid: false,
  }
}

export function defaultSensor(): CargaSensorPayload {
  return {
    tipo_sensor: 'INDUTIVO',
    tipo_sinal: 'DIGITAL',
    tipo_sinal_analogico: '',
    pnp: false,
    npn: false,
    normalmente_aberto: false,
    normalmente_fechado: false,
    range_medicao: '',
  }
}

export function defaultTransdutor(): CargaTransdutorPayload {
  return {
    tipo_transdutor: 'PRESSAO',
    faixa_medicao: '',
    tipo_sinal_analogico: 'CORRENTE_4_20MA',
    precisao: '',
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
    ocupa_entrada_digital: false,
    ocupa_entrada_analogica: false,
    ocupa_saida_digital: false,
    ocupa_saida_analogica: false,
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
