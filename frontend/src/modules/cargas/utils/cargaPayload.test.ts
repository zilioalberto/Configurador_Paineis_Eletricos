import { describe, expect, it } from 'vitest'

import type { CargaFormData } from '../types/carga'
import {
  applyTipoChange,
  cargaFormInitial,
  defaultMotor,
  defaultResistencia,
  defaultSensor,
  defaultTransdutor,
  defaultValvula,
} from './cargaFormDefaults'
import { cargaFormToApiPayload } from './cargaPayload'

describe('cargaFormToApiPayload', () => {
  it('inclui motor e defaults de exigência quando tipo MOTOR', () => {
    const form = cargaFormInitial('proj-1')
    const body = cargaFormToApiPayload(form)
    expect(body.projeto).toBe('proj-1')
    expect(body.tipo).toBe('MOTOR')
    expect(body.motor).toEqual(
      expect.objectContaining({
        potencia_corrente_unidade: 'CV',
        tipo_protecao: 'DISJUNTOR_MOTOR',
      })
    )
    expect(body.exige_protecao).toBe(true)
    expect(body.exige_seccionamento).toBe(false)
    expect(body.exige_fonte_auxiliar).toBe(false)
  })

  it('remove strings vazias do motor antes de enviar', () => {
    const form = cargaFormInitial('p')
    form.motor = {
      ...defaultMotor(),
      tempo_partida_s: '',
    }
    const body = cargaFormToApiPayload(form) as { motor: Record<string, unknown> }
    expect(body.motor.tempo_partida_s).toBeNull()
  })

  it('envia valvula com números quando preenchidos', () => {
    let form = applyTipoChange(cargaFormInitial('p'), 'VALVULA')
    form.valvula = {
      ...defaultValvula(),
      quantidade_vias: '2',
      quantidade_posicoes: '3',
    }
    const body = cargaFormToApiPayload(form) as { valvula: Record<string, unknown> }
    expect(body.valvula.quantidade_vias).toBe(2)
    expect(body.valvula.quantidade_posicoes).toBe(3)
  })

  it('não inclui motor quando tipo diferente', () => {
    const form = applyTipoChange(cargaFormInitial('p'), 'OUTRO') as CargaFormData
    const body = cargaFormToApiPayload(form)
    expect(body.motor).toBeUndefined()
  })

  it('envia resistência quando tipo RESISTENCIA', () => {
    let form = applyTipoChange(cargaFormInitial('p'), 'RESISTENCIA')
    form.resistencia = defaultResistencia()
    const body = cargaFormToApiPayload(form)
    expect(body.resistencia).toEqual(expect.objectContaining({ quantidade_etapas: 1 }))
  })

  it('envia sensor com tipo_sinal_analogico null quando vazio', () => {
    let form = applyTipoChange(cargaFormInitial('p'), 'SENSOR')
    form.sensor = {
      ...defaultSensor(),
      tipo_sinal_analogico: '',
    }
    const body = cargaFormToApiPayload(form) as { sensor: Record<string, unknown> }
    expect(body.sensor.tipo_sinal_analogico).toBeNull()
  })

  it('envia transdutor', () => {
    let form = applyTipoChange(cargaFormInitial('p'), 'TRANSDUTOR')
    form.transdutor = defaultTransdutor()
    const body = cargaFormToApiPayload(form)
    expect(body.transdutor).toEqual(
      expect.objectContaining({ tipo_transdutor: 'PRESSAO' })
    )
  })
})
