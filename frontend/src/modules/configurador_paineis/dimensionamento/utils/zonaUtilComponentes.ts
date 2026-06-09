/** Réplica da validação de zona útil para componentes após canaletas (backend). */

export type ZonaUtilComponentes = {
  largura_placa_referencia_mm: number
  altura_placa_referencia_mm: number
  largura_zona_componentes_mm: number
  altura_zona_componentes_mm: number
  area_zona_componentes_mm2: string
  ocupacao_canaletas_largura_mm: number
  ocupacao_canaletas_altura_mm: number
}

export type ValidacaoZonaUtil = {
  ok: boolean
  alertas: string[]
  area_minima_necessaria_mm2: string
  taxa_ocupacao_zona_percentual: string
}

export function calcularZonaUtilComponentes(
  larguraPlacaMm: number,
  alturaPlacaMm: number,
  canaletasVerticais: number,
  faixasHorizontais: number,
  larguraBaseMm: number
): ZonaUtilComponentes {
  const lb = Math.round(larguraBaseMm)
  const ocupacaoLargura = canaletasVerticais * lb
  const ocupacaoAltura = faixasHorizontais * lb
  const larguraZona = larguraPlacaMm - ocupacaoLargura
  const alturaZona = alturaPlacaMm - ocupacaoAltura
  const areaZona = (larguraZona * alturaZona).toFixed(2)

  return {
    largura_placa_referencia_mm: larguraPlacaMm,
    altura_placa_referencia_mm: alturaPlacaMm,
    largura_zona_componentes_mm: larguraZona,
    altura_zona_componentes_mm: alturaZona,
    area_zona_componentes_mm2: areaZona,
    ocupacao_canaletas_largura_mm: ocupacaoLargura,
    ocupacao_canaletas_altura_mm: ocupacaoAltura,
  }
}

export function validarZonaUtilComponentes(
  zona: ZonaUtilComponentes,
  areaComponentesMm2: number,
  taxaMaxPercentual: number
): ValidacaoZonaUtil {
  const alertas: string[] = []
  const areaDisp = Number(zona.area_zona_componentes_mm2)
  const areaMin =
    areaComponentesMm2 > 0 && taxaMaxPercentual > 0
      ? Number((areaComponentesMm2 / (taxaMaxPercentual / 100)).toFixed(2))
      : 0

  if (zona.largura_zona_componentes_mm <= 0) {
    alertas.push(
      `As canaletas verticais ocupam ${zona.ocupacao_canaletas_largura_mm} mm de largura, ` +
        `mas a placa útil tem apenas ${zona.largura_placa_referencia_mm} mm — ` +
        'não sobra espaço horizontal para componentes.'
    )
  }
  if (zona.altura_zona_componentes_mm <= 0) {
    alertas.push(
      `As canaletas horizontais ocupam ${zona.ocupacao_canaletas_altura_mm} mm de altura, ` +
        `mas a placa útil tem apenas ${zona.altura_placa_referencia_mm} mm — ` +
        'não sobra espaço vertical para componentes.'
    )
  }
  if (areaComponentesMm2 > 0 && areaDisp < areaMin) {
    alertas.push(
      `A área útil para componentes após canaletas é ${areaDisp.toFixed(2)} mm², ` +
        `inferior à mínima de ${areaMin.toFixed(2)} mm² (taxa máx. ${taxaMaxPercentual} %).`
    )
  }

  let taxaZona = '0'
  if (areaDisp > 0 && areaComponentesMm2 > 0) {
    taxaZona = ((areaComponentesMm2 / areaDisp) * 100).toFixed(2)
  } else if (areaComponentesMm2 > 0) {
    taxaZona = '999.99'
  }

  return {
    ok: alertas.length === 0,
    alertas,
    area_minima_necessaria_mm2: areaMin.toFixed(2),
    taxa_ocupacao_zona_percentual: taxaZona,
  }
}
