import { describe, expect, it } from 'vitest'

import type { CargaDetail } from '@/modules/cargas/types/carga'
import { cargaDetailToForm } from '@/modules/cargas/utils/cargaDetailToForm'

const base: Omit<CargaDetail, 'tipo'> = {
  id: '1',
  projeto: 'p',
  tag: 'T',
  descricao: 'D',
  quantidade: 2,
  exige_comando: true,
  quantidade_entradas_digitais: 1,
  quantidade_entradas_analogicas: 0,
  quantidade_saidas_digitais: 0,
  quantidade_saidas_analogicas: 0,
  quantidade_entradas_rapidas: 0,
  ativo: true,
}

describe('cargaDetailToForm', () => {
  it('MOTOR com API: normaliza unidade inválida para CV', () => {
    const d = {
      ...base,
      tipo: 'MOTOR' as const,
      motor: {
        potencia_corrente_valor: '3',
        potencia_corrente_unidade: 'INVALID',
        numero_fases: 3,
        tensao_motor: 220,
      },
    } as unknown as CargaDetail
    const f = cargaDetailToForm(d)
    expect(f.motor?.potencia_corrente_unidade).toBe('CV')
  })

  it('MOTOR sem nested usa defaultMotor', () => {
    const d: CargaDetail = { ...base, tipo: 'MOTOR' }
    const f = cargaDetailToForm(d)
    expect(f.motor?.potencia_corrente_unidade).toBe('CV')
  })

  it('MOTOR: tipo_protecao FUSIVEL_ULTRARRAPIDO vira FUSIVEL no form', () => {
    const d = {
      ...base,
      tipo: 'MOTOR' as const,
      motor: {
        potencia_corrente_valor: '1',
        potencia_corrente_unidade: 'A',
        numero_fases: 3,
        tensao_motor: 380,
        tipo_protecao: 'FUSIVEL_ULTRARRAPIDO',
      },
    } as unknown as CargaDetail
    expect(cargaDetailToForm(d).motor?.tipo_protecao).toBe('FUSIVEL')
  })

  it('VALVULA com nested e RESISTENCIA sem nested', () => {
    const v: CargaDetail = {
      ...base,
      tipo: 'VALVULA',
      valvula: {
        tipo_valvula: 'SOLENOIDE',
        quantidade_vias: '3',
        quantidade_posicoes: '2',
        quantidade_solenoides: 1,
        retorno_mola: false,
        possui_feedback: true,
        tensao_alimentacao: 24,
        tipo_corrente: 'CC',
        corrente_consumida_ma: '100',
        tipo_protecao: 'MINIDISJUNTOR',
        tipo_acionamento: 'SOLENOIDE_DIRETO',
      },
    }
    expect(cargaDetailToForm(v).valvula?.tipo_valvula).toBe('SOLENOIDE')
    expect(cargaDetailToForm(v).valvula?.tipo_rele_interface).toBe('')

    const r: CargaDetail = { ...base, tipo: 'RESISTENCIA' }
    expect(cargaDetailToForm(r).resistencia?.potencia_kw).toBeDefined()
  })

  it('VALVULA: legado RELE_ESTADO_SOLIDO normaliza para relé de interface', () => {
    const v: CargaDetail = {
      ...base,
      tipo: 'VALVULA',
      valvula: {
        tipo_valvula: 'SOLENOIDE',
        quantidade_solenoides: 1,
        tensao_alimentacao: 24,
        tipo_corrente: 'CC',
        corrente_consumida_ma: '100',
        tipo_protecao: 'MINIDISJUNTOR',
        tipo_acionamento: 'RELE_ESTADO_SOLIDO',
      },
    }
    const f = cargaDetailToForm(v)
    expect(f.valvula?.tipo_acionamento).toBe('RELE_INTERFACE')
    expect(f.valvula?.tipo_rele_interface).toBe('ESTADO_SOLIDO')
  })

  it('SENSOR: quantidade_fios vazio permanece string vazia', () => {
    const d: CargaDetail = {
      ...base,
      tipo: 'SENSOR',
      sensor: {
        tipo_sensor: 'INDUTIVO',
        tipo_sinal: 'DIGITAL',
        tipo_sinal_analogico: '',
        tensao_alimentacao: 24,
        tipo_corrente: 'CC',
        corrente_consumida_ma: '10',
        quantidade_fios: '',
        pnp: false,
        npn: false,
        normalmente_aberto: true,
        normalmente_fechado: false,
      },
    }
    expect(cargaDetailToForm(d).sensor?.quantidade_fios).toBe('')
  })

  it('TRANSDUTOR com nested e defaults de topo', () => {
    const d: CargaDetail = {
      ...base,
      tipo: 'TRANSDUTOR',
      local_instalacao: undefined,
      observacoes: undefined,
      ativo: false,
      transdutor: {
        tipo_transdutor: 'PRESSAO',
        faixa_medicao: '0-10',
        tipo_sinal_analogico: 'CORRENTE_4_20MA',
        tensao_alimentacao: 24,
        tipo_corrente: 'CC',
        corrente_consumida_ma: '15',
        quantidade_fios: 4,
      },
    }
    const f = cargaDetailToForm(d)
    expect(f.transdutor?.faixa_medicao).toBe('0-10')
    expect(f.ativo).toBe(false)
    expect(f.local_instalacao).toBe('')
  })

  it('VALVULA sem nested usa defaultValvula', () => {
    const d: CargaDetail = { ...base, tipo: 'VALVULA' }
    expect(cargaDetailToForm(d).valvula?.tipo_valvula).toBe('SOLENOIDE')
  })

  it('TRANSDUTOR: quantidade_fios vazio permanece string vazia', () => {
    const d: CargaDetail = {
      ...base,
      tipo: 'TRANSDUTOR',
      transdutor: {
        tipo_transdutor: 'PRESSAO',
        faixa_medicao: '',
        tipo_sinal_analogico: 'CORRENTE_4_20MA',
        tensao_alimentacao: 24,
        tipo_corrente: 'CC',
        corrente_consumida_ma: '15',
        quantidade_fios: '',
      },
    }
    expect(cargaDetailToForm(d).transdutor?.quantidade_fios).toBe('')
  })
})
