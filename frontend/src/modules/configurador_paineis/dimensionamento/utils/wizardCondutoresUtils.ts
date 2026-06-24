/** Utilitários de bitolas: opções filtradas por Iz, overrides e mínimos normativos. */

import type { CircuitoCargaCondutores, TabelaReferenciaCondutor } from '../types/dimensionamento'

export const SUGESTAO_CONDUTOR = '__sugestao__'
export const MIN_MM2_ALIMENTACAO_GERAL = 2.5

export type OverridesCircuito = {
  fase: string
  neutro: string
  pe: string
}

export function parseNum(s: string | null | undefined): number {
  if (s == null || s === '') return 0
  return Number(String(s).replace(',', '.'))
}

export function overrideBitolaAgCoerente(raw: string | null | undefined): string {
  const base = raw ?? SUGESTAO_CONDUTOR
  if (base === SUGESTAO_CONDUTOR) return base
  const n = parseNum(base)
  if (n > 0 && n < MIN_MM2_ALIMENTACAO_GERAL) return SUGESTAO_CONDUTOR
  return base
}

export function opcoesBitolaFase(
  tabela: TabelaReferenciaCondutor[],
  circuito: CircuitoCargaCondutores
): string[] {
  const ib = parseNum(circuito.corrente_referencia_a)
  if (circuito.classificacao_circuito !== 'POTENCIA' || ib <= 0) {
    return tabela.map((t) => t.secao_mm2)
  }
  return tabela.filter((t) => parseNum(t.iz_a) >= ib).map((t) => t.secao_mm2)
}

export function opcoesBitolaNeutro(
  tabela: TabelaReferenciaCondutor[],
  circuito: CircuitoCargaCondutores
): string[] {
  if (!circuito.possui_neutro) return []
  return opcoesBitolaFase(tabela, circuito)
}

export function opcoesBitolaAlimentacao(tabela: TabelaReferenciaCondutor[], ib: number): string[] {
  if (ib <= 0) return tabela.map((t) => t.secao_mm2)
  return tabela.filter((t) => parseNum(t.iz_a) >= ib).map((t) => t.secao_mm2)
}

export function opcoesBitolaAlimentacaoGeral(
  tabela: TabelaReferenciaCondutor[],
  ib: number
): string[] {
  return opcoesBitolaAlimentacao(tabela, ib).filter(
    (s) => parseNum(s) >= MIN_MM2_ALIMENTACAO_GERAL
  )
}

export function opcoesBitolaPeAlimentacaoGeral(tabela: TabelaReferenciaCondutor[]): string[] {
  return tabela
    .map((t) => t.secao_mm2)
    .filter((s) => parseNum(s) >= MIN_MM2_ALIMENTACAO_GERAL)
}

export function opcoesBitolaPe(tabela: TabelaReferenciaCondutor[]): string[] {
  return tabela.map((t) => t.secao_mm2)
}

export function buildOverridesCircuito(c: CircuitoCargaCondutores): OverridesCircuito {
  return {
    fase: c.secao_condutor_fase_escolhida_mm2 ?? SUGESTAO_CONDUTOR,
    neutro: c.secao_condutor_neutro_escolhida_mm2 ?? SUGESTAO_CONDUTOR,
    pe: c.secao_condutor_pe_escolhida_mm2 ?? SUGESTAO_CONDUTOR,
  }
}

export function estaAprovado(c: CircuitoCargaCondutores): boolean {
  return Boolean(c.condutores_aprovado)
}

export function toPayloadNull(v: string): string | null {
  return v === SUGESTAO_CONDUTOR ? null : v
}
