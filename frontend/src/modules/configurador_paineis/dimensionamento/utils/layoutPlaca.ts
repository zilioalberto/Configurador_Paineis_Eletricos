/** Gera layout frontal da placa (réplica simplificada do backend). */

export const TRILHO_DIN_ALTURA_PERFIL_MM = 7.5

export type ExtremidadeCanaleta = 'superior' | 'inferior' | null

export type CanaletaLayoutItem = {
  orientacao: 'vertical' | 'horizontal'
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
  comprimento_mm: number
  fixa_extremidade?: ExtremidadeCanaleta
  arrastavel?: boolean
  indice_faixa?: number
}

export type TrilhoDinLayoutItem = {
  orientacao: 'trilho_din'
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
  comprimento_mm: number
}

export type LayoutPlaca = {
  placa_largura_mm: number
  placa_altura_mm: number
  largura_base_mm: number
  trilho_din_altura_perfil_mm: number
  comprimento_canaleta_vertical_mm: number
  comprimento_canaleta_horizontal_mm: number
  canaletas_horizontais_intermediarias_y_mm: number[]
  canaletas_verticais: CanaletaLayoutItem[]
  canaletas_horizontais: CanaletaLayoutItem[]
  trilhos_din: TrilhoDinLayoutItem[]
  /** Altura do perfil da canaleta no catálogo (mm), distinta da base usada no desconto da placa. */
  canaleta_altura_perfil_mm?: number
  zona_componentes: {
    x_mm: number
    y_mm: number
    largura_mm: number
    altura_mm: number
  }
}

export type RetanguloBloqueioCanaleta = {
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
}

export function posicoesYIntermediariasPadrao(
  alturaPlacaMm: number,
  faixasHorizontais: number,
  larguraBaseMm: number
): number[] {
  if (faixasHorizontais <= 2) return []
  const lb = larguraBaseMm
  const yMin = lb
  const yMax = alturaPlacaMm - 2 * lb
  if (yMax <= yMin) return []
  const qtd = faixasHorizontais - 2
  if (qtd <= 0) return []
  return Array.from({ length: qtd }, (_, i) =>
    Math.round(yMin + ((i + 1) * (yMax - yMin)) / (qtd + 1))
  )
}

export function posicoesYCanaletasHorizontais(
  alturaPlacaMm: number,
  faixasHorizontais: number,
  larguraBaseMm: number,
  intermediariasYMm?: number[]
): number[] {
  if (faixasHorizontais <= 0) return []
  const lb = larguraBaseMm
  if (faixasHorizontais === 1) return [0]

  const ySuperior = 0
  const yInferior = alturaPlacaMm - lb
  if (faixasHorizontais === 2) return [ySuperior, yInferior]

  const padrao = posicoesYIntermediariasPadrao(alturaPlacaMm, faixasHorizontais, lb)
  const intermediarias =
    intermediariasYMm?.length === padrao.length
      ? [...intermediariasYMm].sort((a, b) => a - b)
      : padrao

  return [ySuperior, ...intermediarias, yInferior]
}

function posicoesXCanaletasVerticais(
  larguraPlacaMm: number,
  canaletasVerticais: number,
  larguraBaseMm: number
): number[] {
  if (canaletasVerticais <= 0) return []
  if (canaletasVerticais === 1) return [0]
  if (canaletasVerticais === 2) return [0, larguraPlacaMm - larguraBaseMm]
  const espaco = larguraPlacaMm - canaletasVerticais * larguraBaseMm
  const passo = canaletasVerticais > 1 ? espaco / (canaletasVerticais - 1) : 0
  return Array.from({ length: canaletasVerticais }, (_, i) =>
    Math.round(i * (larguraBaseMm + passo))
  )
}

export function gerarTrilhosDinLayout(
  horizontais: CanaletaLayoutItem[],
  xInicioMm: number,
  comprimentoMm: number,
  alturaPerfilMm = TRILHO_DIN_ALTURA_PERFIL_MM
): TrilhoDinLayoutItem[] {
  if (horizontais.length < 2 || comprimentoMm <= 0) return []

  const ordenadas = [...horizontais].sort((a, b) => a.y_mm - b.y_mm)
  const alturaInt = Math.max(1, Math.round(alturaPerfilMm))
  const trilhos: TrilhoDinLayoutItem[] = []

  for (let i = 0; i < ordenadas.length - 1; i += 1) {
    const superior = ordenadas[i]
    const inferior = ordenadas[i + 1]
    const yFimSuperior = superior.y_mm + superior.altura_mm
    const yInicioInferior = inferior.y_mm
    if (yInicioInferior <= yFimSuperior) continue

    const centroY = (yFimSuperior + yInicioInferior) / 2
    const yTrilho = Math.round(centroY - alturaPerfilMm / 2)
    trilhos.push({
      orientacao: 'trilho_din',
      x_mm: xInicioMm,
      y_mm: Math.max(yFimSuperior, yTrilho),
      largura_mm: comprimentoMm,
      altura_mm: Math.min(alturaInt, yInicioInferior - yFimSuperior),
      comprimento_mm: comprimentoMm,
    })
  }

  return trilhos
}

export function gerarLayoutPlaca(
  larguraPlacaMm: number,
  alturaPlacaMm: number,
  canaletasVerticais: number,
  faixasHorizontais: number,
  larguraBaseMm: number,
  intermediariasYMm?: number[],
  canaletaAlturaPerfilMm?: number
): LayoutPlaca {
  const lb = Math.round(larguraBaseMm)
  const ocupacaoLargura = canaletasVerticais * lb
  const comprimentoHorizontal = Math.max(0, larguraPlacaMm - ocupacaoLargura)
  const xInicioH = canaletasVerticais >= 1 ? lb : 0
  const alturaVertical = Math.max(0, alturaPlacaMm - 2 * lb)
  const yVertical = lb

  const padraoIntermediarias = posicoesYIntermediariasPadrao(
    alturaPlacaMm,
    faixasHorizontais,
    lb
  )
  const intermediariasSalvas =
    intermediariasYMm?.length === padraoIntermediarias.length
      ? [...intermediariasYMm].sort((a, b) => a - b)
      : padraoIntermediarias

  const posicoesY = posicoesYCanaletasHorizontais(
    alturaPlacaMm,
    faixasHorizontais,
    lb,
    intermediariasSalvas
  )

  const canaletasHorizontais = posicoesY.map((y, indice) => {
    let extremidade: ExtremidadeCanaleta = null
    if (indice === 0) extremidade = 'superior'
    else if (indice === posicoesY.length - 1) extremidade = 'inferior'
    const larguraTotal = extremidade !== null
    return {
      orientacao: 'horizontal' as const,
      x_mm: larguraTotal ? 0 : xInicioH,
      y_mm: y,
      largura_mm: larguraTotal ? larguraPlacaMm : comprimentoHorizontal,
      altura_mm: lb,
      comprimento_mm: larguraTotal ? larguraPlacaMm : comprimentoHorizontal,
      fixa_extremidade: extremidade,
      arrastavel: extremidade === null,
      indice_faixa: indice,
    }
  })

  const larguraZona = larguraPlacaMm - ocupacaoLargura
  const alturaZona = alturaPlacaMm - faixasHorizontais * lb

  return {
    placa_largura_mm: larguraPlacaMm,
    placa_altura_mm: alturaPlacaMm,
    largura_base_mm: lb,
    trilho_din_altura_perfil_mm: TRILHO_DIN_ALTURA_PERFIL_MM,
    comprimento_canaleta_vertical_mm: alturaVertical,
    comprimento_canaleta_horizontal_mm: comprimentoHorizontal,
    canaletas_horizontais_intermediarias_y_mm: intermediariasSalvas,
    canaletas_verticais: posicoesXCanaletasVerticais(
      larguraPlacaMm,
      canaletasVerticais,
      lb
    ).map((x) => ({
      orientacao: 'vertical' as const,
      x_mm: x,
      y_mm: yVertical,
      largura_mm: lb,
      altura_mm: alturaVertical,
      comprimento_mm: alturaVertical,
      fixa_extremidade: null,
      arrastavel: false,
    })),
    canaletas_horizontais: canaletasHorizontais,
    trilhos_din: gerarTrilhosDinLayout(canaletasHorizontais, xInicioH, comprimentoHorizontal),
    canaleta_altura_perfil_mm:
      canaletaAlturaPerfilMm && canaletaAlturaPerfilMm > 0
        ? canaletaAlturaPerfilMm
        : undefined,
    zona_componentes: {
      x_mm: xInicioH,
      y_mm: faixasHorizontais > 0 ? lb : 0,
      largura_mm: larguraZona,
      altura_mm: alturaZona,
    },
  }
}

export function clampYCanaletaIntermediaria(
  yMm: number,
  layout: LayoutPlaca,
  indiceFaixa: number,
  bloqueios: RetanguloBloqueioCanaleta[] = []
): number {
  const lb = layout.largura_base_mm
  const yMin = lb
  const yMax = layout.placa_altura_mm - 2 * lb
  const ordenadas = [...layout.canaletas_horizontais].sort((a, b) => a.y_mm - b.y_mm)
  const atual = ordenadas.find((c) => c.indice_faixa === indiceFaixa)
  if (!atual || atual.fixa_extremidade) return yMm

  const idx = ordenadas.findIndex((c) => c.indice_faixa === indiceFaixa)
  const superior = ordenadas[idx - 1]
  const inferior = ordenadas[idx + 1]
  const min = superior ? superior.y_mm + superior.altura_mm + 8 : yMin
  const max = inferior ? inferior.y_mm - lb - 8 : yMax
  let yClamp = Math.min(max, Math.max(min, yMm))

  const xInicio = atual.x_mm
  const xFim = atual.x_mm + atual.largura_mm
  const intervalosInvalidos = bloqueios
    .filter((b) => b.x_mm < xFim && b.x_mm + b.largura_mm > xInicio)
    .map((b) => ({
      inicio: b.y_mm - atual.altura_mm,
      fim: b.y_mm + b.altura_mm,
    }))
    .filter((intervalo) => intervalo.fim > min && intervalo.inicio < max)
    .map((intervalo) => ({
      inicio: Math.max(min, intervalo.inicio),
      fim: Math.min(max, intervalo.fim),
    }))
    .sort((a, b) => a.inicio - b.inicio)

  for (const intervalo of intervalosInvalidos) {
    if (yClamp <= intervalo.inicio || yClamp >= intervalo.fim) continue
    yClamp = yClamp >= atual.y_mm ? intervalo.inicio : intervalo.fim
  }

  return Math.round(Math.min(max, Math.max(min, yClamp)))
}

export function atualizarCanaletaIntermediariaY(
  layout: LayoutPlaca,
  indiceFaixa: number,
  yMm: number,
  bloqueios: RetanguloBloqueioCanaleta[] = []
): LayoutPlaca {
  const intermediarias = [...layout.canaletas_horizontais_intermediarias_y_mm]
  const alvo = layout.canaletas_horizontais.find((c) => c.indice_faixa === indiceFaixa)
  if (!alvo || alvo.fixa_extremidade) return layout

  const idxInter = layout.canaletas_horizontais
    .filter((c) => c.arrastavel)
    .sort((a, b) => (a.indice_faixa ?? 0) - (b.indice_faixa ?? 0))
    .findIndex((c) => c.indice_faixa === indiceFaixa)
  if (idxInter < 0) return layout

  const yClamp = clampYCanaletaIntermediaria(yMm, layout, indiceFaixa, bloqueios)
  intermediarias[idxInter] = yClamp

  return gerarLayoutPlaca(
    layout.placa_largura_mm,
    layout.placa_altura_mm,
    layout.canaletas_verticais.length,
    layout.canaletas_horizontais.length,
    layout.largura_base_mm,
    intermediarias,
    layout.canaleta_altura_perfil_mm
  )
}

export type SegmentoFaixaVerticalMm = {
  inicio_mm: number
  fim_mm: number
  label: string
}

/** Cotas verticais entre canaletas horizontais consecutivas. */
export function montarCotasFaixasHorizontais(layout: LayoutPlaca): SegmentoFaixaVerticalMm[] {
  const horizontais = [...layout.canaletas_horizontais].sort((a, b) => a.y_mm - b.y_mm)
  const segmentos: SegmentoFaixaVerticalMm[] = []
  for (let i = 0; i < horizontais.length - 1; i += 1) {
    const sup = horizontais[i]
    const inf = horizontais[i + 1]
    const inicio = sup.y_mm + sup.altura_mm
    const fim = inf.y_mm
    if (fim > inicio) {
      segmentos.push({ inicio_mm: inicio, fim_mm: fim, label: `${fim - inicio}` })
    }
  }
  return segmentos
}

function formatDimensaoMm(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace(/\.0$/, '')
}

export type CanaletaDimensoesRotulo = {
  largura_base_mm: number
  canaleta_altura_perfil_mm?: number
}

/** Texto completo para tooltip / legenda. */
export function tituloCanaleta(
  c: CanaletaLayoutItem,
  dims: CanaletaDimensoesRotulo
): string {
  const base = dims.largura_base_mm
  const alturaPerfil = dims.canaleta_altura_perfil_mm
  const comprimento = c.comprimento_mm
  if (alturaPerfil && alturaPerfil > 0) {
    return `${formatDimensaoMm(base)} mm (base) × ${formatDimensaoMm(alturaPerfil)} mm altura × ${formatDimensaoMm(comprimento)} mm comprimento`
  }
  if (c.orientacao === 'vertical') {
    return `${formatDimensaoMm(c.largura_mm)} mm (base) × ${formatDimensaoMm(comprimento)} mm comprimento`
  }
  return `${formatDimensaoMm(c.altura_mm)} mm (base) × ${formatDimensaoMm(comprimento)} mm comprimento`
}

/** Rótulo compacto desenhado sobre a canaleta no diagrama. */
export function rotuloCanaleta(
  c: CanaletaLayoutItem,
  dims: CanaletaDimensoesRotulo
): string {
  const base = dims.largura_base_mm
  const alturaPerfil = dims.canaleta_altura_perfil_mm
  const comprimento = c.comprimento_mm
  if (alturaPerfil && alturaPerfil > 0) {
    return `${formatDimensaoMm(base)} base · ${formatDimensaoMm(alturaPerfil)} alt · ${formatDimensaoMm(comprimento)} comp`
  }
  if (c.orientacao === 'vertical') {
    return `${formatDimensaoMm(c.largura_mm)}×${formatDimensaoMm(comprimento)}`
  }
  return `${formatDimensaoMm(c.altura_mm)}×${formatDimensaoMm(comprimento)}`
}

export function descricaoCanaletaVerticalLegenda(layout: LayoutPlaca): string {
  return tituloCanaleta(
    {
      orientacao: 'vertical',
      x_mm: 0,
      y_mm: 0,
      largura_mm: layout.largura_base_mm,
      altura_mm: layout.comprimento_canaleta_vertical_mm,
      comprimento_mm: layout.comprimento_canaleta_vertical_mm,
    },
    layout
  )
}

export function descricaoCanaletaHorizontalLegenda(layout: LayoutPlaca): string {
  return tituloCanaleta(
    {
      orientacao: 'horizontal',
      x_mm: 0,
      y_mm: 0,
      largura_mm: layout.comprimento_canaleta_horizontal_mm,
      altura_mm: layout.largura_base_mm,
      comprimento_mm: layout.comprimento_canaleta_horizontal_mm,
    },
    layout
  )
}
