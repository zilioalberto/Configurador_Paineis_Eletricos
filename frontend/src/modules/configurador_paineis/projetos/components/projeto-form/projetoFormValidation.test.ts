import { describe, expect, it } from 'vitest'

import { ApiError } from '@/services/http/ApiError'
import { projetoFormInitialState } from './formOptions'
import {
  haErrosDeCampoNaRespostaApi,
  mapearErrosValidacaoApi,
  validarProjetoFormulario,
} from './projetoFormValidation'

describe('validarProjetoFormulario', () => {
  it('exige família do PLC quando possui_plc', () => {
    const erros = validarProjetoFormulario({
      ...projetoFormInitialState,
      possui_plc: true,
      familia_plc: null,
    })
    expect(erros.familia_plc).toMatch(/PLC/i)
  })

  it('exige tipo de climatização quando possui_climatizacao', () => {
    const erros = validarProjetoFormulario({
      ...projetoFormInitialState,
      possui_climatizacao: true,
      tipo_climatizacao: null,
    })
    expect(erros.tipo_climatizacao).toMatch(/climatiza/i)
  })

  it('aceita PLC sem família quando possui_plc é false', () => {
    const erros = validarProjetoFormulario({
      ...projetoFormInitialState,
      possui_plc: false,
      familia_plc: null,
    })
    expect(erros.familia_plc).toBeUndefined()
  })
})

describe('mapearErrosValidacaoApi', () => {
  it('lê listas de mensagens do DRF', () => {
    const err = new ApiError('bad', {
      status: 400,
      details: {
        familia_plc: ['Informe a família do PLC, pois o painel possui PLC.'],
      },
    })
    expect(mapearErrosValidacaoApi(err)).toEqual({
      familia_plc: 'Informe a família do PLC, pois o painel possui PLC.',
    })
    expect(haErrosDeCampoNaRespostaApi(err)).toBe(true)
  })

  it('retorna vazio quando não é ApiError com detalhes de campo', () => {
    expect(mapearErrosValidacaoApi(new Error('x'))).toEqual({})
    expect(haErrosDeCampoNaRespostaApi(new Error('x'))).toBe(false)
  })
})
