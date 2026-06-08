/** Diagrama SVG da placa de montagem com canaletas, zona, cotas e disposição de componentes. */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { LayoutPlaca } from '../utils/layoutPlaca'
import {
  atualizarCanaletaIntermediariaY,
  descricaoCanaletaHorizontalLegenda,
  descricaoCanaletaVerticalLegenda,
  gerarTrilhosDinLayout,
  montarCotasFaixasHorizontais,
  rotuloCanaleta,
  tituloCanaleta,
  TRILHO_DIN_ALTURA_PERFIL_MM,
} from '../utils/layoutPlaca'
import type { ComponenteDisposicaoItem, DimensionamentoMecanicoItem } from '../types/dimensionamento'
import {
  ajustarPosicaoArraste,
  criarMapaEscopoPorComposicaoItem,
  idsComponentesComConflitoDisposicao,
  montarTooltipComponenteDisposicao,
  rotuloComponenteCurto,
  segmentarTrilhosDinComDisposicao,
} from '../utils/disposicaoComponentes'
import { CotaLinear } from './placaCotasSvg'

type Props = {
  layout: LayoutPlaca
  className?: string
  disposicao?: ComponenteDisposicaoItem[]
  itensConsiderados?: DimensionamentoMecanicoItem[]
  editavel?: boolean
  onDisposicaoChange?: (itens: ComponenteDisposicaoItem[]) => void
  onLayoutChange?: (layout: LayoutPlaca) => void
}

const PAD_TOP = 24
const PAD_LEFT = 108
const PAD_RIGHT = 32
const PAD_BOTTOM = 56
const COTA_OFFSET_INTERMEDIARIA = 36
const COTA_OFFSET_TOTAL_ALTURA = 68
const COTA_OFFSET_TOTAL_LARGURA = 36

const COLORS = {
  placa: '#f8f9fa',
  placaStroke: '#495057',
  vertical: '#6ea8fe',
  horizontal: '#ffc107',
  trilho: '#adb5bd',
  trilhoStroke: '#495057',
  zona: '#d1e7dd',
  zonaStroke: '#198754',
  componente: '#cfe2ff',
  componenteStroke: '#0d6efd',
  componenteManual: '#ffe69c',
  componenteManualStroke: '#cc9a06',
  componenteConflito: '#f8d7da',
  componenteConflitoStroke: '#dc3545',
}

export default function PlacaCanaletasDiagram({
  layout,
  className = '',
  disposicao = [],
  itensConsiderados = [],
  editavel = false,
  onDisposicaoChange,
  onLayoutChange,
}: Props) {
  const { placa_largura_mm: pw, placa_altura_mm: ph } = layout
  const placaSemDimensoes = pw <= 0 || ph <= 0
  const larguraEscala = placaSemDimensoes ? 1 : pw
  const alturaEscala = placaSemDimensoes ? 1 : ph

  const nVert = layout.canaletas_verticais.length
  const nHor = layout.canaletas_horizontais.length
  const trilhosBase =
    layout.trilhos_din ??
    gerarTrilhosDinLayout(
      layout.canaletas_horizontais,
      layout.zona_componentes.x_mm,
      layout.comprimento_canaleta_horizontal_mm,
      layout.trilho_din_altura_perfil_mm ?? TRILHO_DIN_ALTURA_PERFIL_MM
    )
  const trilhosVisiveis = useMemo(
    () => segmentarTrilhosDinComDisposicao(trilhosBase, disposicao),
    [trilhosBase, disposicao]
  )

  const scale = Math.min(560 / larguraEscala, 520 / alturaEscala, 2.2)
  const plateX = PAD_LEFT
  const plateY = PAD_TOP
  const svgW = pw * scale + PAD_LEFT + PAD_RIGHT
  const svgH = ph * scale + PAD_TOP + PAD_BOTTOM

  const tx = (mm: number) => plateX + mm * scale
  const ty = (mm: number) => plateY + mm * scale
  const tw = (mm: number) => mm * scale
  const th = (mm: number) => mm * scale

  const yPlacaBottom = ty(ph)
  const xPlacaLeft = tx(0)

  const xCotaIntermediaria = xPlacaLeft - COTA_OFFSET_INTERMEDIARIA
  const xCotaTotalAltura = xPlacaLeft - COTA_OFFSET_TOTAL_ALTURA

  const cotasFaixas = montarCotasFaixasHorizontais(layout)
  const idsConflito = idsComponentesComConflitoDisposicao(disposicao, layout)
  const mapaEscopo = criarMapaEscopoPorComposicaoItem(itensConsiderados)

  const svgRef = useRef<SVGSVGElement>(null)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [arrastandoCanaleta, setArrastandoCanaleta] = useState<number | null>(null)
  const layoutRef = useRef(layout)
  const disposicaoRef = useRef(disposicao)
  const onDisposicaoChangeRef = useRef(onDisposicaoChange)
  const onLayoutChangeRef = useRef(onLayoutChange)
  const arrasteRef = useRef<{
    tipo: 'componente' | 'canaleta'
    pointerId: number
    instanciaId?: string
    indiceFaixa?: number
    offsetX: number
    offsetY: number
    origem?: ComponenteDisposicaoItem
  } | null>(null)

  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  useEffect(() => {
    disposicaoRef.current = disposicao
  }, [disposicao])

  useEffect(() => {
    onDisposicaoChangeRef.current = onDisposicaoChange
  }, [onDisposicaoChange])

  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange
  }, [onLayoutChange])

  const mmFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return { x: 0, y: 0 }
      const local = pt.matrixTransform(ctm.inverse())
      return {
        x: (local.x - plateX) / scale,
        y: (local.y - plateY) / scale,
      }
    },
    [plateX, plateY, scale]
  )

  const liberarCapturaPonteiro = useCallback((pointerId: number | null | undefined) => {
    const svg = svgRef.current
    if (!svg || pointerId == null) return
    try {
      if (svg.hasPointerCapture(pointerId)) {
        svg.releasePointerCapture(pointerId)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const finalizarArraste = useCallback(() => {
    liberarCapturaPonteiro(arrasteRef.current?.pointerId)
    arrasteRef.current = null
    setArrastandoId(null)
    setArrastandoCanaleta(null)
  }, [liberarCapturaPonteiro])

  const processarMovimentoArraste = useCallback(
    (clientX: number, clientY: number) => {
      const arraste = arrasteRef.current
      if (!arraste) return
      const mm = mmFromClient(clientX, clientY)

      if (arraste.tipo === 'canaleta' && arraste.indiceFaixa != null) {
        const callback = onLayoutChangeRef.current
        if (!callback) return
        const y = mm.y - arraste.offsetY
        const novoLayout = atualizarCanaletaIntermediariaY(
          layoutRef.current,
          arraste.indiceFaixa,
          y,
          disposicaoRef.current
        )
        layoutRef.current = novoLayout
        callback(novoLayout)
        return
      }

      const callback = onDisposicaoChangeRef.current
      if (!callback || !arraste.instanciaId) return

      const disposicaoAtual = disposicaoRef.current
      const itemAtual =
        disposicaoAtual.find((d) => d.instancia_id === arraste.instanciaId) ?? arraste.origem
      if (!itemAtual) return
      const novoX = mm.x - arraste.offsetX
      const novoY = mm.y - arraste.offsetY
      const outros = disposicaoAtual.filter((d) => d.instancia_id !== arraste.instanciaId)
      const ajustado = ajustarPosicaoArraste(
        { ...itemAtual, manual: true },
        novoX,
        novoY,
        layoutRef.current,
        outros
      )
      if (!ajustado) return

      arrasteRef.current = { ...arraste, origem: ajustado }
      const proximaDisposicao = disposicaoAtual.map((d) =>
        d.instancia_id === arraste.instanciaId ? ajustado : d
      )
      disposicaoRef.current = proximaDisposicao
      callback(proximaDisposicao)
    },
    [mmFromClient]
  )

  const onPointerDownComponente = useCallback(
    (event: ReactPointerEvent, item: ComponenteDisposicaoItem) => {
      if (!editavel || !onDisposicaoChange) return
      event.preventDefault()
      event.stopPropagation()
      const mm = mmFromClient(event.clientX, event.clientY)
      arrasteRef.current = {
        tipo: 'componente',
        pointerId: event.pointerId,
        instanciaId: item.instancia_id,
        offsetX: mm.x - item.x_mm,
        offsetY: mm.y - item.y_mm,
        origem: item,
      }
      setArrastandoId(item.instancia_id)
      try {
        svgRef.current?.setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    },
    [editavel, mmFromClient, onDisposicaoChange]
  )

  const onPointerDownCanaleta = useCallback(
    (event: ReactPointerEvent, indiceFaixa: number, yMm: number) => {
      if (!editavel || !onLayoutChange) return
      event.preventDefault()
      event.stopPropagation()
      const mm = mmFromClient(event.clientX, event.clientY)
      arrasteRef.current = {
        tipo: 'canaleta',
        pointerId: event.pointerId,
        indiceFaixa,
        offsetX: 0,
        offsetY: mm.y - yMm,
      }
      setArrastandoCanaleta(indiceFaixa)
      try {
        svgRef.current?.setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    },
    [editavel, mmFromClient, onLayoutChange]
  )

  useEffect(() => {
    if (!editavel) {
      finalizarArraste()
      return
    }

    const onWindowPointerMove = (event: PointerEvent) => {
      const arraste = arrasteRef.current
      if (!arraste || arraste.pointerId !== event.pointerId) return
      event.preventDefault()
      processarMovimentoArraste(event.clientX, event.clientY)
    }
    const onWindowPointerUp = (event: PointerEvent) => {
      const arraste = arrasteRef.current
      if (!arraste || arraste.pointerId !== event.pointerId) return
      event.preventDefault()
      finalizarArraste()
    }
    const onWindowBlur = () => finalizarArraste()

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false })
    window.addEventListener('pointerup', onWindowPointerUp, { passive: false })
    window.addEventListener('pointercancel', onWindowPointerUp, { passive: false })
    window.addEventListener('blur', onWindowBlur)
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [editavel, finalizarArraste, processarMovimentoArraste])

  if (placaSemDimensoes) {
    return <p className="text-muted small mb-0">Placa sem dimensões para desenho.</p>
  }

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-100"
        style={{
          maxHeight: 620,
          touchAction: editavel ? 'none' : undefined,
          userSelect: editavel ? 'none' : undefined,
          cursor:
            arrastandoCanaleta !== null ? 'ns-resize' : arrastandoId ? 'grabbing' : undefined,
        }}
        role="img"
        aria-label="Diagrama da placa com canaletas e cotas"
      >
        <title>
          Placa {pw} × {ph} mm — {nVert} verticais, {nHor} horizontais, {trilhosBase.length}{' '}
          trilho(s) DIN
        </title>

        {/* Placa */}
        <rect
          x={tx(0)}
          y={ty(0)}
          width={tw(pw)}
          height={th(ph)}
          fill={COLORS.placa}
          stroke={COLORS.placaStroke}
          strokeWidth={1.5}
        />

        {/* Zona componentes (sem cota) */}
        <rect
          x={tx(layout.zona_componentes.x_mm)}
          y={ty(layout.zona_componentes.y_mm)}
          width={tw(layout.zona_componentes.largura_mm)}
          height={th(layout.zona_componentes.altura_mm)}
          fill={COLORS.zona}
          stroke={COLORS.zonaStroke}
          strokeWidth={1}
          strokeDasharray="6 4"
          pointerEvents="none"
        />

        {/* Canaletas verticais */}
        {layout.canaletas_verticais.map((c, i) => (
          <g key={`v-${i}`}>
            <title>{tituloCanaleta(c, layout)}</title>
            <rect
              x={tx(c.x_mm)}
              y={ty(c.y_mm)}
              width={tw(c.largura_mm)}
              height={th(c.altura_mm)}
              fill={COLORS.vertical}
              fillOpacity={0.75}
              stroke="#0d6efd"
              strokeWidth={1}
            />
            <text
              x={tx(c.x_mm) + tw(c.largura_mm) / 2}
              y={ty(c.y_mm) + th(c.altura_mm) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7}
              fill="#084298"
              stroke="none"
              transform={`rotate(-90 ${tx(c.x_mm) + tw(c.largura_mm) / 2} ${ty(c.y_mm) + th(c.altura_mm) / 2})`}
            >
              {rotuloCanaleta(c, layout)}
            </text>
          </g>
        ))}

        {/* Trilhos DIN (entre canaletas horizontais) */}
        {trilhosVisiveis.map((t, i) => (
          <g key={`t-${i}`}>
            <rect
              x={tx(t.x_mm)}
              y={ty(t.y_mm)}
              width={tw(t.largura_mm)}
              height={th(t.altura_mm)}
              fill={COLORS.trilho}
              fillOpacity={0.95}
              stroke={COLORS.trilhoStroke}
              strokeWidth={1.2}
            />
            <line
              x1={tx(t.x_mm)}
              y1={ty(t.y_mm)}
              x2={tx(t.x_mm + t.largura_mm)}
              y2={ty(t.y_mm)}
              stroke="#343a40"
              strokeWidth={1.5}
            />
            <line
              x1={tx(t.x_mm)}
              y1={ty(t.y_mm + t.altura_mm)}
              x2={tx(t.x_mm + t.largura_mm)}
              y2={ty(t.y_mm + t.altura_mm)}
              stroke="#dee2e6"
              strokeWidth={1}
            />
            <text
              x={tx(t.x_mm) + tw(t.largura_mm) / 2}
              y={ty(t.y_mm) + th(t.altura_mm) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fill="#212529"
              stroke="none"
            >
              DIN {t.comprimento_mm}
            </text>
          </g>
        ))}

        {/* Canaletas horizontais */}
        {layout.canaletas_horizontais.map((c, i) => {
          const arrastavel = Boolean(c.arrastavel && editavel && onLayoutChange)
          const ativo = arrastandoCanaleta === c.indice_faixa
          return (
            <g key={`h-${i}`}>
              <title>{tituloCanaleta(c, layout)}</title>
              <rect
                x={tx(c.x_mm)}
                y={ty(c.y_mm)}
                width={tw(c.largura_mm)}
                height={th(c.altura_mm)}
                fill={COLORS.horizontal}
                fillOpacity={arrastavel ? 0.92 : 0.8}
                stroke={ativo ? '#664d03' : '#cc9a06'}
                strokeWidth={ativo ? 2 : 1}
                style={{ cursor: arrastavel ? (ativo ? 'grabbing' : 'ns-resize') : 'default' }}
                onPointerDown={
                  arrastavel && c.indice_faixa != null
                    ? (event) => onPointerDownCanaleta(event, c.indice_faixa!, c.y_mm)
                    : undefined
                }
              />
              <text
                x={tx(c.x_mm) + tw(c.largura_mm) / 2}
                y={ty(c.y_mm) + th(c.altura_mm) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7}
                fill="#664d03"
                stroke="none"
                pointerEvents="none"
              >
                {rotuloCanaleta(c, layout)}
              </text>
            </g>
          )
        })}

        {/* Componentes na placa (acima das canaletas para interação) */}
        {disposicao.map((comp) => {
          const manual = comp.manual
          const ativo = arrastandoId === comp.instancia_id
          const conflito = idsConflito.has(comp.instancia_id)
          const fill = conflito
            ? COLORS.componenteConflito
            : manual
              ? COLORS.componenteManual
              : COLORS.componente
          const stroke = conflito
            ? COLORS.componenteConflitoStroke
            : manual
              ? COLORS.componenteManualStroke
              : COLORS.componenteStroke
          const tooltip = montarTooltipComponenteDisposicao(
            comp,
            mapaEscopo.get(comp.composicao_item_id)
          )
          return (
            <g key={`comp-${comp.instancia_id}`}>
              <title>{tooltip}</title>
              <rect
                x={tx(comp.x_mm)}
                y={ty(comp.y_mm)}
                width={tw(comp.largura_mm)}
                height={th(comp.altura_mm)}
                fill={fill}
                fillOpacity={ativo ? 0.95 : 0.85}
                stroke={stroke}
                strokeWidth={conflito ? 2 : ativo ? 2 : 1.2}
                rx={2}
                style={{
                  cursor: editavel ? (ativo ? 'grabbing' : 'grab') : 'default',
                }}
                onPointerDown={
                  editavel ? (event) => onPointerDownComponente(event, comp) : undefined
                }
              />
              <text
                x={tx(comp.x_mm) + tw(comp.largura_mm) / 2}
                y={ty(comp.y_mm) + th(comp.altura_mm) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7}
                fill="#212529"
                stroke="none"
                pointerEvents="none"
              >
                {rotuloComponenteCurto(comp.produto_codigo)}
              </text>
            </g>
          )
        })}

        {/* Cotas entre faixas horizontais */}
        {cotasFaixas.map((seg, i) => (
          <CotaLinear
            key={`cf-${i}`}
            x1={xCotaIntermediaria}
            y1={ty(seg.inicio_mm)}
            x2={xCotaIntermediaria}
            y2={ty(seg.fim_mm)}
            refX1={xPlacaLeft}
            refY1={ty(seg.inicio_mm)}
            refX2={xPlacaLeft}
            refY2={ty(seg.fim_mm)}
            label={`${seg.label} mm`}
          />
        ))}

        {/* Cota geral — largura total */}
        <CotaLinear
          x1={tx(0)}
          y1={yPlacaBottom + COTA_OFFSET_TOTAL_LARGURA}
          x2={tx(pw)}
          y2={yPlacaBottom + COTA_OFFSET_TOTAL_LARGURA}
          refX1={tx(0)}
          refY1={yPlacaBottom}
          refX2={tx(pw)}
          refY2={yPlacaBottom}
          label={`${pw} mm`}
        />

        {/* Cota geral — altura total */}
        <CotaLinear
          x1={xCotaTotalAltura}
          y1={ty(0)}
          x2={xCotaTotalAltura}
          y2={ty(ph)}
          refX1={xPlacaLeft}
          refY1={ty(0)}
          refX2={xPlacaLeft}
          refY2={ty(ph)}
          label={`${ph} mm`}
        />
      </svg>

      <div className="d-flex flex-wrap gap-3 small text-muted mt-2">
        <span>
          <span
            className="d-inline-block rounded-1 me-1"
            style={{ width: 12, height: 12, background: COLORS.vertical, opacity: 0.75 }}
          />
          Verticais — {descricaoCanaletaVerticalLegenda(layout)}
        </span>
        <span>
          <span
            className="d-inline-block rounded-1 me-1"
            style={{ width: 12, height: 12, background: COLORS.horizontal, opacity: 0.8 }}
          />
          Horizontais — {descricaoCanaletaHorizontalLegenda(layout)}
        </span>
        <span>
          <span
            className="d-inline-block rounded-1 me-1"
            style={{ width: 12, height: 12, background: COLORS.trilho }}
          />
          Trilho DIN ({trilhosBase.length}) — comp. {layout.comprimento_canaleta_horizontal_mm} mm
          {trilhosVisiveis.length > trilhosBase.length
            ? ` · ${trilhosVisiveis.length} trechos visíveis`
            : ''}
        </span>
        <span>
          <span
            className="d-inline-block rounded-1 me-1 border"
            style={{ width: 12, height: 12, background: COLORS.zona }}
          />
          Zona componentes
        </span>
        {disposicao.length > 0 ? (
          <span>
            <span
              className="d-inline-block rounded-1 me-1 border"
              style={{ width: 12, height: 12, background: COLORS.componenteConflito }}
            />
            Conflito (canaleta ou sobreposição)
          </span>
        ) : null}
        {disposicao.length > 0 ? (
          <span>
            <span
              className="d-inline-block rounded-1 me-1 border"
              style={{ width: 12, height: 12, background: COLORS.componente }}
            />
            Componentes ({disposicao.length})
            {editavel ? ' — arraste para ajustar; passe o mouse para detalhes' : ' — passe o mouse para detalhes'}
          </span>
        ) : null}
      </div>
    </div>
  )
}
