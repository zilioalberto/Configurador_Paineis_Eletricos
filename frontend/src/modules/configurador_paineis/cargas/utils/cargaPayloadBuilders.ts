/** Constrói payloads aninhados (motor, válvula, etc.) para a API. */

import type { CargaFormData } from '../types/carga'
import { defaultMotor } from './cargaFormDefaults'

export function omitEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj }
  for (const k of Object.keys(out)) {
    if (out[k] === '') {
      delete out[k]
    }
  }
  return out
}

export function buildMotorPayload(
  motor: NonNullable<CargaFormData['motor']>
): Record<string, unknown> {
  const base = defaultMotor()
  const merged = { ...base, ...motor }
  const nf = Number(merged.numero_fases)
  const tm = Number(merged.tensao_motor)
  return omitEmptyStrings({
    ...merged,
    numero_fases: Number.isFinite(nf) ? nf : base.numero_fases,
    tensao_motor: Number.isFinite(tm) ? tm : base.tensao_motor,
  })
}

export function buildValvulaPayload(
  valvula: NonNullable<CargaFormData['valvula']>
): Record<string, unknown> {
  return omitEmptyStrings({
    ...valvula,
    quantidade_solenoides: Number(valvula.quantidade_solenoides || 1),
    quantidade_vias: valvula.quantidade_vias ? Number(valvula.quantidade_vias) : null,
    quantidade_posicoes: valvula.quantidade_posicoes
      ? Number(valvula.quantidade_posicoes)
      : null,
    tensao_alimentacao: Number(valvula.tensao_alimentacao),
    corrente_consumida_ma: Number(valvula.corrente_consumida_ma || 0),
  })
}

export function buildResistenciaPayload(
  resistencia: NonNullable<CargaFormData['resistencia']>
): Record<string, unknown> {
  return {
    ...resistencia,
    numero_fases: Number(resistencia.numero_fases),
    tensao_resistencia: Number(resistencia.tensao_resistencia),
    potencia_kw: Number(resistencia.potencia_kw || 0),
  }
}

export function buildSensorPayload(
  sensor: NonNullable<CargaFormData['sensor']>
): Record<string, unknown> {
  return omitEmptyStrings({
    ...sensor,
    tipo_sinal_analogico: sensor.tipo_sinal_analogico || null,
    tensao_alimentacao: Number(sensor.tensao_alimentacao),
    corrente_consumida_ma: Number(sensor.corrente_consumida_ma || 0),
    quantidade_fios:
      sensor.quantidade_fios === '' ? null : Number(sensor.quantidade_fios),
  })
}

export function buildTransdutorPayload(
  transdutor: NonNullable<CargaFormData['transdutor']>
): Record<string, unknown> {
  return omitEmptyStrings({
    ...transdutor,
    tipo_sinal_analogico: transdutor.tipo_sinal_analogico || null,
    tensao_alimentacao: Number(transdutor.tensao_alimentacao),
    corrente_consumida_ma: Number(transdutor.corrente_consumida_ma || 0),
    quantidade_fios:
      transdutor.quantidade_fios === '' ? null : Number(transdutor.quantidade_fios),
  })
}
