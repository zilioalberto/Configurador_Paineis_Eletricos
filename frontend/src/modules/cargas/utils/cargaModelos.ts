import type { CargaFormData, TipoCarga } from '../types/carga'
import { applyTipoChange, cargaFormInitial, emptyNestedForTipo } from './cargaFormDefaults'

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
  const withTipo = applyTipoChange(cargaFormInitial(projetoId), tipo)
  if (!isObject(payload)) {
    return withTipo
  }

  const nestedDefaults = emptyNestedForTipo(tipo)
  const nestedMerged = { ...nestedDefaults }

  if (nestedMerged.motor && isObject(payload.motor)) {
    nestedMerged.motor = { ...nestedMerged.motor, ...payload.motor }
  }
  if (nestedMerged.valvula && isObject(payload.valvula)) {
    nestedMerged.valvula = { ...nestedMerged.valvula, ...payload.valvula }
  }
  if (nestedMerged.resistencia && isObject(payload.resistencia)) {
    nestedMerged.resistencia = {
      ...nestedMerged.resistencia,
      ...payload.resistencia,
    }
  }
  if (nestedMerged.sensor && isObject(payload.sensor)) {
    nestedMerged.sensor = { ...nestedMerged.sensor, ...payload.sensor }
  }
  if (nestedMerged.transdutor && isObject(payload.transdutor)) {
    nestedMerged.transdutor = {
      ...nestedMerged.transdutor,
      ...payload.transdutor,
    }
  }

  const {
    motor: _motor,
    valvula: _valvula,
    resistencia: _resistencia,
    sensor: _sensor,
    transdutor: _transdutor,
    ...restPayload
  } = payload

  const quantidade =
    typeof payload.quantidade === 'number' &&
    Number.isFinite(payload.quantidade) &&
    payload.quantidade > 0
      ? payload.quantidade
      : withTipo.quantidade

  return {
    ...withTipo,
    ...restPayload,
    ...nestedMerged,
    projeto: projetoId,
    tipo,
    tag: '',
    quantidade,
  } as CargaFormData
}
