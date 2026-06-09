/** Réplica da regra do backend para pré-visualizar faixas horizontais sugeridas. */

export function sugerirFaixasHorizontais(

  alturaPlacaMm: number,

  larguraBaseMm: number,

  espacamentoMaxMm = 160,

  minimoFaixas = 2

): number {

  if (alturaPlacaMm <= 0 || larguraBaseMm <= 0) return minimoFaixas



  let n = Math.max(minimoFaixas, 2)

  while (n < 20) {

    const ocupacaoTrilhos = n * larguraBaseMm

    if (ocupacaoTrilhos >= alturaPlacaMm) return Math.max(minimoFaixas, n - 1)

    const faixaLivreMax = (alturaPlacaMm - ocupacaoTrilhos) / (n - 1)

    if (faixaLivreMax <= espacamentoMaxMm) return n

    n += 1

  }

  return n

}

