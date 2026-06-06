import type { CargaFormData, TipoCarga } from '../types/carga'
import {
  buildMotorPayload,
  buildResistenciaPayload,
  buildSensorPayload,
  buildTransdutorPayload,
  buildValvulaPayload,
} from './cargaPayloadBuilders'

/** Monta o corpo da API: aninha só o bloco compatível com `tipo`. */
export function cargaFormToApiPayload(data: CargaFormData): Record<string, unknown> {
  const { motor, valvula, resistencia, sensor, transdutor, ...base } = data

  const body: Record<string, unknown> = {
    ...base,
    exige_protecao: true,
    exige_seccionamento: false,
  }

  const tipo = data.tipo as TipoCarga

  if (tipo === 'MOTOR' && motor) {
    body.motor = buildMotorPayload(motor)
  }
  if (tipo === 'VALVULA' && valvula) {
    body.valvula = buildValvulaPayload(valvula)
  }
  if (tipo === 'RESISTENCIA' && resistencia) {
    body.resistencia = buildResistenciaPayload(resistencia)
  }
  if (tipo === 'SENSOR' && sensor) {
    body.sensor = buildSensorPayload(sensor)
  }
  if (tipo === 'TRANSDUTOR' && transdutor) {
    body.transdutor = buildTransdutorPayload(transdutor)
  }

  return body
}
