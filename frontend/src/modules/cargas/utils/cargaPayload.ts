import type { CargaFormData, TipoCarga } from '../types/carga'
import { defaultMotor } from './cargaFormDefaults'

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
  }

  const tipo = data.tipo as TipoCarga

  if (tipo === 'MOTOR' && motor) {
    const base = defaultMotor()
    const merged = { ...base, ...motor }
    const nf = Number(merged.numero_fases)
    const tm = Number(merged.tensao_motor)
    const m = omitEmptyStrings({
      ...merged,
      numero_fases: Number.isFinite(nf) ? nf : base.numero_fases,
      tensao_motor: Number.isFinite(tm) ? tm : base.tensao_motor,
    } as Record<string, unknown>)
    body.motor = m
  }
  if (tipo === 'VALVULA' && valvula) {
    body.valvula = omitEmptyStrings({
      ...valvula,
      quantidade_solenoides: Number(valvula.quantidade_solenoides || 1),
      quantidade_vias: valvula.quantidade_vias
        ? Number(valvula.quantidade_vias)
        : null,
      quantidade_posicoes: valvula.quantidade_posicoes
        ? Number(valvula.quantidade_posicoes)
        : null,
      tensao_alimentacao: Number(valvula.tensao_alimentacao),
      corrente_consumida_ma: Number(valvula.corrente_consumida_ma || 0),
    } as Record<string, unknown>)
  }
  if (tipo === 'RESISTENCIA' && resistencia) {
    body.resistencia = {
      ...resistencia,
      numero_fases: Number(resistencia.numero_fases),
      tensao_resistencia: Number(resistencia.tensao_resistencia),
      potencia_kw: Number(resistencia.potencia_kw || 0),
    }
  }
  if (tipo === 'SENSOR' && sensor) {
    body.sensor = omitEmptyStrings({
      ...sensor,
      tipo_sinal_analogico: sensor.tipo_sinal_analogico || null,
      tensao_alimentacao: Number(sensor.tensao_alimentacao),
      corrente_consumida_ma: Number(sensor.corrente_consumida_ma || 0),
      quantidade_fios:
        sensor.quantidade_fios === '' ? null : Number(sensor.quantidade_fios),
    } as Record<string, unknown>)
  }
  if (tipo === 'TRANSDUTOR' && transdutor) {
    body.transdutor = omitEmptyStrings({
      ...transdutor,
      tipo_sinal_analogico: transdutor.tipo_sinal_analogico || null,
      tensao_alimentacao: Number(transdutor.tensao_alimentacao),
      corrente_consumida_ma: Number(transdutor.corrente_consumida_ma || 0),
      quantidade_fios:
        transdutor.quantidade_fios === '' ? null : Number(transdutor.quantidade_fios),
    } as Record<string, unknown>)
  }

  return body
}
