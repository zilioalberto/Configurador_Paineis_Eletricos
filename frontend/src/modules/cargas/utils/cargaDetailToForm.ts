import { normalizarTipoProtecaoMotorNoForm } from '../constants/cargaChoiceOptions'
import type { CargaDetail, CargaFormData } from '../types/carga'
import {
  defaultMotor,
  defaultResistencia,
  defaultSensor,
  defaultTransdutor,
  defaultValvula,
  emptyNestedForTipo,
} from './cargaFormDefaults'

function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v)
}

function num(v: unknown, fallback: number): number {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Normaliza resposta GET em estado do formulário. */
export function cargaDetailToForm(d: CargaDetail): CargaFormData {
  const nested = emptyNestedForTipo(d.tipo)

  if (d.tipo === 'MOTOR' && d.motor) {
    const u = String(d.motor.potencia_corrente_unidade ?? 'CV')
    const unidade =
      u === 'KW' || u === 'A' || u === 'CV' ? u : ('CV' as const)
    nested.motor = {
      potencia_corrente_valor: str(d.motor.potencia_corrente_valor, '1.00'),
      potencia_corrente_unidade: unidade,
      numero_fases: num(d.motor.numero_fases, 3),
      tensao_motor: num(d.motor.tensao_motor, 380),
      rendimento_percentual: str(d.motor.rendimento_percentual, '85.00'),
      fator_potencia: str(d.motor.fator_potencia, '0.85'),
      tipo_partida: str(d.motor.tipo_partida, 'DIRETA'),
      tipo_protecao: normalizarTipoProtecaoMotorNoForm(
        str(d.motor.tipo_protecao, 'DISJUNTOR_MOTOR')
      ),
      reversivel: Boolean(d.motor.reversivel),
      freio_motor: Boolean(d.motor.freio_motor),
      tipo_conexao_painel: str(
        d.motor.tipo_conexao_painel,
        'CONEXAO_BORNES_COM_PE'
      ),
    }
  } else if (d.tipo === 'MOTOR') {
    nested.motor = defaultMotor()
  }

  if (d.tipo === 'VALVULA' && d.valvula) {
    let tipoAcionamento = str(d.valvula.tipo_acionamento, 'SOLENOIDE_DIRETO')
    let tipoReleInterface = str(d.valvula.tipo_rele_interface, '')
    if (tipoAcionamento === 'RELE_ESTADO_SOLIDO') {
      if (!tipoReleInterface) tipoReleInterface = 'ESTADO_SOLIDO'
      tipoAcionamento = 'RELE_INTERFACE'
    } else if (tipoAcionamento === 'RELE_ACOPLADOR') {
      tipoAcionamento = 'RELE_INTERFACE'
    }
    nested.valvula = {
      tipo_valvula: str(d.valvula.tipo_valvula, 'SOLENOIDE'),
      quantidade_vias: str(d.valvula.quantidade_vias, ''),
      quantidade_posicoes: str(d.valvula.quantidade_posicoes, ''),
      quantidade_solenoides: num(d.valvula.quantidade_solenoides, 1),
      retorno_mola: Boolean(d.valvula.retorno_mola),
      possui_feedback: Boolean(d.valvula.possui_feedback),
      tensao_alimentacao: num(d.valvula.tensao_alimentacao, 24),
      tipo_corrente: str(d.valvula.tipo_corrente, 'CC') as 'CA' | 'CC',
      corrente_consumida_ma: str(d.valvula.corrente_consumida_ma, '200.00'),
      tipo_protecao: str(d.valvula.tipo_protecao, 'MINIDISJUNTOR'),
      tipo_acionamento: tipoAcionamento,
      tipo_rele_interface:
        tipoAcionamento === 'RELE_INTERFACE'
          ? tipoReleInterface || 'ELETROMECANICA'
          : '',
    }
  } else if (d.tipo === 'VALVULA') {
    nested.valvula = defaultValvula()
  }

  if (d.tipo === 'RESISTENCIA' && d.resistencia) {
    const ta = str(d.resistencia.tipo_acionamento, 'CONTATOR')
    nested.resistencia = {
      numero_fases: num(d.resistencia.numero_fases, 3),
      tensao_resistencia: num(d.resistencia.tensao_resistencia, 380),
      tipo_protecao: str(d.resistencia.tipo_protecao, 'MINIDISJUNTOR'),
      tipo_acionamento: ta,
      tipo_rele_interface: str(d.resistencia.tipo_rele_interface, ''),
      tipo_conexao_painel: str(
        d.resistencia.tipo_conexao_painel,
        'CONEXAO_BORNES_COM_PE'
      ),
      potencia_kw: str(d.resistencia.potencia_kw, '1.000'),
    }
    if (nested.resistencia.tipo_acionamento !== 'RELE_INTERFACE') {
      nested.resistencia.tipo_rele_interface = ''
    } else if (!nested.resistencia.tipo_rele_interface) {
      nested.resistencia.tipo_rele_interface = 'ELETROMECANICA'
    }
  } else if (d.tipo === 'RESISTENCIA') {
    nested.resistencia = defaultResistencia()
  }

  if (d.tipo === 'SENSOR' && d.sensor) {
    nested.sensor = {
      tipo_sensor: str(d.sensor.tipo_sensor, 'INDUTIVO'),
      tipo_sinal: str(d.sensor.tipo_sinal, 'DIGITAL'),
      tipo_sinal_analogico: str(d.sensor.tipo_sinal_analogico, ''),
      tensao_alimentacao: num(d.sensor.tensao_alimentacao, 24),
      tipo_corrente: str(d.sensor.tipo_corrente, 'CC') as 'CA' | 'CC',
      corrente_consumida_ma: str(d.sensor.corrente_consumida_ma, '20.00'),
      quantidade_fios: str(d.sensor.quantidade_fios) === '' ? '' : num(d.sensor.quantidade_fios, 0),
      pnp: Boolean(d.sensor.pnp),
      npn: Boolean(d.sensor.npn),
      normalmente_aberto: Boolean(d.sensor.normalmente_aberto),
      normalmente_fechado: Boolean(d.sensor.normalmente_fechado),
    }
  } else if (d.tipo === 'SENSOR') {
    nested.sensor = defaultSensor()
  }

  if (d.tipo === 'TRANSDUTOR' && d.transdutor) {
    nested.transdutor = {
      tipo_transdutor: str(d.transdutor.tipo_transdutor, 'PRESSAO'),
      faixa_medicao: str(d.transdutor.faixa_medicao, ''),
      tipo_sinal_analogico: str(
        d.transdutor.tipo_sinal_analogico,
        'CORRENTE_4_20MA'
      ),
      tensao_alimentacao: num(d.transdutor.tensao_alimentacao, 24),
      tipo_corrente: str(d.transdutor.tipo_corrente, 'CC') as 'CA' | 'CC',
      corrente_consumida_ma: str(d.transdutor.corrente_consumida_ma, '20.00'),
      quantidade_fios: str(d.transdutor.quantidade_fios) === '' ? '' : num(d.transdutor.quantidade_fios, 0),
    }
  } else if (d.tipo === 'TRANSDUTOR') {
    nested.transdutor = defaultTransdutor()
  }

  return {
    projeto: d.projeto,
    tag: str(d.tag),
    descricao: str(d.descricao),
    tipo: d.tipo,
    quantidade: num(d.quantidade, 1),
    local_instalacao: str(d.local_instalacao),
    observacoes: str(d.observacoes),
    exige_comando: Boolean(d.exige_comando),
    quantidade_entradas_digitais: num(d.quantidade_entradas_digitais, 0),
    quantidade_entradas_analogicas: num(d.quantidade_entradas_analogicas, 0),
    quantidade_saidas_digitais: num(d.quantidade_saidas_digitais, 0),
    quantidade_saidas_analogicas: num(d.quantidade_saidas_analogicas, 0),
    quantidade_entradas_rapidas: num(d.quantidade_entradas_rapidas, 0),
    ativo: d.ativo !== false,
    ...nested,
  }
}
