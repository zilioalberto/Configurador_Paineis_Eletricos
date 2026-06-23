/** Primitivas SVG para cotas dimensionais (estilo técnico). */

const DIM_COLOR = '#495057'
const ARROW = 5

type CotaLinearProps = {
  /** Coordenadas SVG já escaladas */
  x1: number
  y1: number
  x2: number
  y2: number
  /** Ponto de referência da geometria para linhas de extensão */
  refX1: number
  refY1: number
  refX2: number
  refY2: number
  label: string
  offset?: number
}

function arrowHead(x: number, y: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  const x1 = x - ARROW * Math.cos(rad - Math.PI / 6)
  const y1 = y - ARROW * Math.sin(rad - Math.PI / 6)
  const x2 = x - ARROW * Math.cos(rad + Math.PI / 6)
  const y2 = y - ARROW * Math.sin(rad + Math.PI / 6)
  return `${x},${y} ${x1},${y1} ${x2},${y2}`
}

export function CotaLinear({
  x1,
  y1,
  x2,
  y2,
  refX1,
  refY1,
  refX2,
  refY2,
  label,
}: CotaLinearProps) {
  const horizontal = Math.abs(y2 - y1) < 0.5
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  return (
    <g className="cota-linear" stroke={DIM_COLOR} fill={DIM_COLOR} strokeWidth={0.9}>
      <line x1={refX1} y1={refY1} x2={x1} y2={y1} strokeWidth={0.6} />
      <line x1={refX2} y1={refY2} x2={x2} y2={y2} strokeWidth={0.6} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon points={arrowHead(x1, y1, horizontal ? 0 : 90)} />
      <polygon points={arrowHead(x2, y2, horizontal ? 180 : 270)} />
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fill={DIM_COLOR}
        stroke="none"
        transform={horizontal ? `translate(0, 11)` : `rotate(-90 ${midX} ${midY}) translate(0, -11)`}
      >
        {label}
      </text>
    </g>
  )
}

export type SegmentoCotaMm = {
  inicio_mm: number
  fim_mm: number
  label: string
}

export function montarSegmentosLarguraPlaca(
  larguraPlacaMm: number,
  larguraBaseMm: number,
  comprimentoHorizontalMm: number,
  canaletasVerticais: number
): SegmentoCotaMm[] {
  const lb = larguraBaseMm
  if (canaletasVerticais <= 0) {
    return [{ inicio_mm: 0, fim_mm: larguraPlacaMm, label: `${larguraPlacaMm}` }]
  }
  if (canaletasVerticais === 1) {
    return [
      { inicio_mm: 0, fim_mm: lb, label: `${lb}` },
      {
        inicio_mm: lb,
        fim_mm: larguraPlacaMm,
        label: `${larguraPlacaMm - lb}`,
      },
    ]
  }
  if (canaletasVerticais === 2) {
    return [
      { inicio_mm: 0, fim_mm: lb, label: `${lb}` },
      {
        inicio_mm: lb,
        fim_mm: lb + comprimentoHorizontalMm,
        label: `${comprimentoHorizontalMm}`,
      },
      { inicio_mm: larguraPlacaMm - lb, fim_mm: larguraPlacaMm, label: `${lb}` },
    ]
  }

  const segmentos: SegmentoCotaMm[] = []
  let cursor = 0
  for (let i = 0; i < canaletasVerticais; i += 1) {
    segmentos.push({ inicio_mm: cursor, fim_mm: cursor + lb, label: `${lb}` })
    cursor += lb
    if (i < canaletasVerticais - 1) {
      const espaco = (larguraPlacaMm - canaletasVerticais * lb) / (canaletasVerticais - 1)
      const fim = cursor + espaco
      segmentos.push({
        inicio_mm: cursor,
        fim_mm: Math.round(fim),
        label: `${Math.round(espaco)}`,
      })
      cursor = Math.round(fim)
    }
  }
  return segmentos
}

export function montarSegmentosAlturaPlaca(
  alturaPlacaMm: number,
  larguraBaseMm: number,
  faixasHorizontais: number,
  zonaAlturaMm: number
): SegmentoCotaMm[] {
  const lb = larguraBaseMm
  if (faixasHorizontais <= 0) {
    return [{ inicio_mm: 0, fim_mm: alturaPlacaMm, label: `${alturaPlacaMm}` }]
  }

  const posicoes =
    faixasHorizontais === 1
      ? [0]
      : Array.from({ length: faixasHorizontais }, (_, i) =>
          Math.round((i * (alturaPlacaMm - lb)) / (faixasHorizontais - 1))
        )

  const segmentos: SegmentoCotaMm[] = []
  let cursor = 0

  for (let i = 0; i < posicoes.length; i += 1) {
    const yBarra = posicoes[i]
    if (yBarra > cursor) {
      segmentos.push({
        inicio_mm: cursor,
        fim_mm: yBarra,
        label: `${yBarra - cursor}`,
      })
    }
    segmentos.push({
      inicio_mm: yBarra,
      fim_mm: yBarra + lb,
      label: `${lb}`,
    })
    cursor = yBarra + lb
  }

  if (cursor < alturaPlacaMm) {
    segmentos.push({
      inicio_mm: cursor,
      fim_mm: alturaPlacaMm,
      label: `${alturaPlacaMm - cursor}`,
    })
  }

  if (segmentos.length > 6) {
    return [
      { inicio_mm: 0, fim_mm: lb, label: `${lb}` },
      {
        inicio_mm: lb,
        fim_mm: lb + Math.max(0, zonaAlturaMm),
        label: `${Math.max(0, zonaAlturaMm)}`,
      },
      {
        inicio_mm: alturaPlacaMm - lb,
        fim_mm: alturaPlacaMm,
        label: `${lb}`,
      },
    ]
  }

  return segmentos
}
