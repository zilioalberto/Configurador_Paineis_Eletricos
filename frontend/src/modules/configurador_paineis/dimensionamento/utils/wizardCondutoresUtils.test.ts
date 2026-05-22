import { describe, expect, it } from 'vitest'
import type { CircuitoCargaCondutores, TabelaReferenciaCondutor } from '../types/dimensionamento'
import {
  MIN_MM2_ALIMENTACAO_GERAL,
  SUGESTAO_CONDUTOR,
  opcoesBitolaAlimentacaoGeral,
  opcoesBitolaFase,
  overrideBitolaAgCoerente,
  parseNum,
} from './wizardCondutoresUtils'

const tabela: TabelaReferenciaCondutor[] = [
  { secao_mm2: '1.5', iz_a: '20' },
  { secao_mm2: '2.5', iz_a: '28' },
  { secao_mm2: '4', iz_a: '36' },
]

const circuitoPotencia: CircuitoCargaCondutores = {
  classificacao_circuito: 'POTENCIA',
  corrente_referencia_a: '25',
  possui_neutro: true,
} as CircuitoCargaCondutores

describe('wizardCondutoresUtils', () => {
  it('parseNum trata vazio e vírgula', () => {
    expect(parseNum(null)).toBe(0)
    expect(parseNum('10,5')).toBe(10.5)
  })

  it('overrideBitolaAgCoerente força sugestão abaixo do mínimo AG', () => {
    expect(overrideBitolaAgCoerente(SUGESTAO_CONDUTOR)).toBe(SUGESTAO_CONDUTOR)
    expect(overrideBitolaAgCoerente('1.5')).toBe(SUGESTAO_CONDUTOR)
    expect(overrideBitolaAgCoerente('4')).toBe('4')
  })

  it('opcoesBitolaFase filtra por Iz >= Ib em circuito de potência', () => {
    expect(opcoesBitolaFase(tabela, circuitoPotencia)).toEqual(['2.5', '4'])
  })

  it('opcoesBitolaAlimentacaoGeral respeita mínimo de alimentação geral', () => {
    const opcoes = opcoesBitolaAlimentacaoGeral(tabela, 10)
    expect(opcoes.every((s) => parseNum(s) >= MIN_MM2_ALIMENTACAO_GERAL)).toBe(true)
    expect(opcoes).not.toContain('1.5')
  })
})
