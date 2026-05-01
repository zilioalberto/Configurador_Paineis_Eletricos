import { describe, expect, it } from 'vitest'

import {
  apiSpecParaFormState,
  especFormParaPayload,
  labelCampoEspec,
  sanitizarEspecificacaoApi,
} from '@/modules/catalogo/utils/specFormHelpers'

describe('specFormHelpers', () => {
  it('labelCampoEspec usa rótulos especiais e capitaliza o restante', () => {
    expect(labelCampoEspec('familia_plc')).toBe('Família do PLC')
    expect(labelCampoEspec('foo_bar')).toBe('Foo Bar')
  })

  it('sanitizarEspecificacaoApi ignora metadados e não-objeto', () => {
    expect(sanitizarEspecificacaoApi(null)).toEqual({})
    expect(sanitizarEspecificacaoApi(undefined)).toEqual({})
    expect(
      sanitizarEspecificacaoApi({
        id: 1,
        criado_em: 'x',
        atualizado_em: 'y',
        foo_display: 'hidden',
        bar: 2,
      }),
    ).toEqual({ bar: 2 })
  })

  it('apiSpecParaFormState normaliza tipos', () => {
    expect(
      apiSpecParaFormState({
        a: null,
        b: true,
        c: 3,
        d: 'txt',
      }),
    ).toEqual({ a: '', b: true, c: 3, d: 'txt' })
  })

  it('especFormParaPayload CONTATORA: decimais, inteiros, boolean e char', () => {
    const estado = {
      corrente_ac3_a: '10,5',
      tensao_bobina_v: '24',
      contatos_aux_na: '2',
      contatos_aux_nf: '0',
      modo_montagem: 'TRILHO_DIN',
      tipo_corrente_bobina: 'CC',
    }
    const payload = especFormParaPayload(estado, 'CONTATORA')
    expect(payload.corrente_ac3_a).toBe('10.5')
    expect(payload.tensao_bobina_v).toBe(24)
    expect(payload.contatos_aux_na).toBe(2)
    expect(payload.contatos_aux_nf).toBe(0)
    expect(payload.modo_montagem).toBe('TRILHO_DIN')
    expect(payload.tipo_corrente_bobina).toBe('CC')
  })

  it('especFormParaPayload omite vazios e categoria desconhecida', () => {
    expect(especFormParaPayload({ x: '' }, 'CONTATORA')).not.toHaveProperty('x')
    expect(
      especFormParaPayload({ a: 1 }, 'CATEGORIA_INEXISTENTE' as unknown as 'CONTATORA'),
    ).toEqual({})
  })

  it('especFormParaPayload BooleanField aceita string true', () => {
    const p = especFormParaPayload(
      { possui_dissipador: 'true' as unknown as boolean },
      'RELE_ESTADO_SOLIDO',
    )
    expect(p.possui_dissipador).toBe(true)
  })
})
