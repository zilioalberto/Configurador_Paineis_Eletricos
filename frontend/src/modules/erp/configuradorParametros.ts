/** Chaves de parâmetros ERP do configurador de painéis (prefixo `configurador.`). */

export const CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES =
  'configurador.degraus_margem_bitola_condutores'

export const PREFIXO_PARAMETRO_CONFIGURADOR = 'configurador.'

export type MargemBitolaOption = { value: number; label: string }

export const margemBitolaCondutoresOptions: MargemBitolaOption[] = [
  { value: 0, label: '0 — mínimo da tabela Iz' },
  { value: 1, label: '1 — uma bitola comercial acima' },
]

export function labelMargemBitola(degraus: number): string {
  const opt = margemBitolaCondutoresOptions.find((o) => o.value === degraus)
  return opt?.label ?? `${degraus} degrau(s) acima do mínimo Iz`
}
