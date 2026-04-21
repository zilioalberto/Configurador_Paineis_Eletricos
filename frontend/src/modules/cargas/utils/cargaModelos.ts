import type { CargaFormData, TipoCarga } from '../types/carga'
import { applyTipoChange, cargaFormInitial } from './cargaFormDefaults'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function criarPayloadModeloCarga(data: CargaFormData): Record<string, unknown> {
  const {
    tipo,
    quantidade,
    motor,
    valvula,
    resistencia,
    sensor,
    transdutor,
  } = data
  const payload: Record<string, unknown> = {
    quantidade,
  }
  if (tipo === 'MOTOR' && motor) payload.motor = motor
  if (tipo === 'VALVULA' && valvula) payload.valvula = valvula
  if (tipo === 'RESISTENCIA' && resistencia) payload.resistencia = resistencia
  if (tipo === 'SENSOR' && sensor) payload.sensor = sensor
  if (tipo === 'TRANSDUTOR' && transdutor) payload.transdutor = transdutor
  return payload
}

export function aplicarModeloNoFormulario(
  projetoId: string,
  tipo: TipoCarga,
  payload: unknown
): CargaFormData {
  const base = cargaFormInitial(projetoId)
  const withTipo = applyTipoChange(base, tipo)
  if (!isObject(payload)) {
    return withTipo
  }
  return {
    ...withTipo,
    ...payload,
    projeto: projetoId,
    tipo,
    tag: '',
    quantidade: 1,
  } as CargaFormData
}
