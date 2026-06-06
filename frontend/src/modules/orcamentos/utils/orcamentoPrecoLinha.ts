import { parseDecimalPt } from './orcamentoUi'

/** Preço = custo + valor da margem + valor do IPI (ambos sobre o custo). */
export function calcularPrecoUnitarioLinha(
  custo: string | number,
  margem: string | number,
  aliquotaIpi?: string | null
): string {
  const custoN = typeof custo === 'number' ? custo : parseDecimalPt(String(custo))
  const margemN = typeof margem === 'number' ? margem : parseDecimalPt(String(margem))
  const ipiN =
    aliquotaIpi == null || aliquotaIpi === ''
      ? 0
      : parseDecimalPt(String(aliquotaIpi))

  if (!Number.isFinite(custoN)) return '0'
  const margemValida = Number.isFinite(margemN) ? margemN : 0
  const ipiValido = Number.isFinite(ipiN) ? ipiN : 0
  const preco = custoN + custoN * (margemValida / 100) + custoN * (ipiValido / 100)
  return String(preco)
}
