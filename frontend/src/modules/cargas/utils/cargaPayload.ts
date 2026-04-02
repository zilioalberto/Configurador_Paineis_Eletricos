import type { CargaFormData, TipoCarga } from '../types/carga'

function omitEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj }
  for (const k of Object.keys(out)) {
    if (out[k] === '') {
      delete out[k]
    }
  }
  return out
}

/** Monta o corpo da API: aninha só o bloco compatível com `tipo`. */
export function cargaFormToApiPayload(data: CargaFormData): Record<string, unknown> {
  const {
    motor,
    valvula,
    resistencia,
    sensor,
    transdutor,
    ...base
  } = data

  const body: Record<string, unknown> = {
    ...base,
    exige_protecao: true,
    exige_seccionamento: false,
    exige_fonte_auxiliar: false,
  }

  const tipo = data.tipo as TipoCarga

  if (tipo === 'MOTOR' && motor) {
    const m = omitEmptyStrings({
      ...motor,
      tempo_partida_s: motor.tempo_partida_s || null,
    } as Record<string, unknown>)
    body.motor = m
  }
  if (tipo === 'VALVULA' && valvula) {
    body.valvula = omitEmptyStrings({
      ...valvula,
      quantidade_vias: valvula.quantidade_vias
        ? Number(valvula.quantidade_vias)
        : null,
      quantidade_posicoes: valvula.quantidade_posicoes
        ? Number(valvula.quantidade_posicoes)
        : null,
    } as Record<string, unknown>)
  }
  if (tipo === 'RESISTENCIA' && resistencia) {
    body.resistencia = resistencia
  }
  if (tipo === 'SENSOR' && sensor) {
    body.sensor = omitEmptyStrings({
      ...sensor,
      tipo_sinal_analogico: sensor.tipo_sinal_analogico || null,
    } as Record<string, unknown>)
  }
  if (tipo === 'TRANSDUTOR' && transdutor) {
    body.transdutor = omitEmptyStrings({
      ...transdutor,
      tipo_sinal_analogico: transdutor.tipo_sinal_analogico || null,
    } as Record<string, unknown>)
  }

  return body
}
