import { describe, expect, it } from 'vitest'

import type { CargaFormData } from '../types/carga'

import { defaultMotor } from './cargaFormDefaults'
import {
  aplicarModeloNoFormulario,
  criarPayloadModeloCarga,
} from './cargaModelos'

function formMotor(over: Partial<CargaFormData>): CargaFormData {
  return {
    projeto: '',
    tag: '',
    descricao: '',
    tipo: 'MOTOR',
    quantidade: 1,
    local_instalacao: '',
    observacoes: '',
    exige_comando: false,
    quantidade_entradas_digitais: 0,
    quantidade_entradas_analogicas: 0,
    quantidade_saidas_digitais: 0,
    quantidade_saidas_analogicas: 0,
    quantidade_entradas_rapidas: 0,
    ativo: true,
    motor: null,
    valvula: null,
    resistencia: null,
    sensor: null,
    transdutor: null,
    ...over,
  }
}

describe('criarPayloadModeloCarga', () => {
  it('inclui apenas o nested do tipo seleccionado', () => {
    const motor = { ...defaultMotor(), tipo_partida: 'DIRETA' as const }
    const data = formMotor({
      tipo: 'MOTOR',
      quantidade: 2,
      motor,
    })
    expect(criarPayloadModeloCarga(data)).toEqual({
      quantidade: 2,
      motor,
    })
  })

  it('para OUTRO não adiciona blocos opcionais', () => {
    const data = formMotor({ tipo: 'OUTRO', quantidade: 3 })
    expect(criarPayloadModeloCarga(data)).toEqual({ quantidade: 3 })
  })
})

describe('aplicarModeloNoFormulario', () => {
  it('ignora payload não object e devolve form só com tipo', () => {
    const r = aplicarModeloNoFormulario('proj-x', 'SENSOR', null)
    expect(r.projeto).toBe('proj-x')
    expect(r.tipo).toBe('SENSOR')
    expect(r.tag).toBe('')
  })

  it('fundir payload válido mantém projetoId e sobrescreve tipo', () => {
    const r = aplicarModeloNoFormulario('pid', 'RESISTENCIA', {
      observacoes: 'x',
    })
    expect(r.projeto).toBe('pid')
    expect(r.tipo).toBe('RESISTENCIA')
    expect(r.tag).toBe('')
    expect((r as { observacoes?: string }).observacoes).toBe('x')
  })

  it('ignora payload array como objeto inválido', () => {
    const r = aplicarModeloNoFormulario('pid-2', 'MOTOR', [])
    expect(r.projeto).toBe('pid-2')
    expect(r.tipo).toBe('MOTOR')
    expect(r.quantidade).toBe(1)
  })

  it('mescla motor parcial do modelo sem perder fases e tensão', () => {
    const r = aplicarModeloNoFormulario('pid-3', 'MOTOR', {
      quantidade: 2,
      motor: {
        potencia_corrente_valor: '5.00',
        tipo_partida: 'DIRETA',
      },
    })
    expect(r.motor?.numero_fases).toBe(3)
    expect(r.motor?.tensao_motor).toBe(380)
    expect(r.motor?.potencia_corrente_valor).toBe('5.00')
    expect(r.quantidade).toBe(2)
  })
})
