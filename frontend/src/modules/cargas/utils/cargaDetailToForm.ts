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
      rendimento_percentual: str(d.motor.rendimento_percentual, '85.00'),
      fator_potencia: str(d.motor.fator_potencia, '0.85'),
      tipo_partida: str(d.motor.tipo_partida, 'DIRETA'),
      tipo_protecao: str(d.motor.tipo_protecao, 'DISJUNTOR_MOTOR'),
      reversivel: Boolean(d.motor.reversivel),
      freio_motor: Boolean(d.motor.freio_motor),
      tempo_partida_s: str(d.motor.tempo_partida_s, ''),
      tipo_conexao_painel: str(
        d.motor.tipo_conexao_painel,
        'CONEXAO_BORNES_COM_PE'
      ),
    }
  } else if (d.tipo === 'MOTOR') {
    nested.motor = defaultMotor()
  }

  if (d.tipo === 'VALVULA' && d.valvula) {
    nested.valvula = {
      tipo_valvula: str(d.valvula.tipo_valvula, 'SOLENOIDE'),
      quantidade_vias: str(d.valvula.quantidade_vias, ''),
      quantidade_posicoes: str(d.valvula.quantidade_posicoes, ''),
      retorno_mola: Boolean(d.valvula.retorno_mola),
      possui_feedback: Boolean(d.valvula.possui_feedback),
    }
  } else if (d.tipo === 'VALVULA') {
    nested.valvula = defaultValvula()
  }

  if (d.tipo === 'RESISTENCIA' && d.resistencia) {
    nested.resistencia = {
      controle_em_etapas: Boolean(d.resistencia.controle_em_etapas),
      quantidade_etapas: num(d.resistencia.quantidade_etapas, 1),
      controle_pid: Boolean(d.resistencia.controle_pid),
    }
  } else if (d.tipo === 'RESISTENCIA') {
    nested.resistencia = defaultResistencia()
  }

  if (d.tipo === 'SENSOR' && d.sensor) {
    nested.sensor = {
      tipo_sensor: str(d.sensor.tipo_sensor, 'INDUTIVO'),
      tipo_sinal: str(d.sensor.tipo_sinal, 'DIGITAL'),
      tipo_sinal_analogico: str(d.sensor.tipo_sinal_analogico, ''),
      pnp: Boolean(d.sensor.pnp),
      npn: Boolean(d.sensor.npn),
      normalmente_aberto: Boolean(d.sensor.normalmente_aberto),
      normalmente_fechado: Boolean(d.sensor.normalmente_fechado),
      range_medicao: str(d.sensor.range_medicao, ''),
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
      precisao: str(d.transdutor.precisao, ''),
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
    ocupa_entrada_digital: Boolean(d.ocupa_entrada_digital),
    ocupa_entrada_analogica: Boolean(d.ocupa_entrada_analogica),
    ocupa_saida_digital: Boolean(d.ocupa_saida_digital),
    ocupa_saida_analogica: Boolean(d.ocupa_saida_analogica),
    ativo: d.ativo !== false,
    ...nested,
  }
}
