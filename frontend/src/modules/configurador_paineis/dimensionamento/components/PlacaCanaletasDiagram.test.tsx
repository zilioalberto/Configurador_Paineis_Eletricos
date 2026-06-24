import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ComponenteDisposicaoItem, DimensionamentoMecanicoItem } from '../types/dimensionamento'
import { gerarLayoutPlaca } from '../utils/layoutPlaca'
import { sugerirDisposicaoComponentes } from '../utils/disposicaoComponentes'
import PlacaCanaletasDiagram from './PlacaCanaletasDiagram'

const itensExemplo: DimensionamentoMecanicoItem[] = [
  {
    composicao_item_id: 'rel-1',
    produto_codigo: 'REL-01',
    produto_descricao: 'Relé interface',
    quantidade: '1',
    largura_mm: '22',
    altura_mm: '90',
    modo_montagem: 'TRILHO_DIN',
    parte_painel: 'COMANDO',
    categoria_produto: 'RELE_INTERFACE',
  },
]

function layoutPadrao() {
  return gerarLayoutPlaca(355, 355, 2, 3, 30, undefined, 50)
}

function disposicaoExemplo(layout = layoutPadrao()): ComponenteDisposicaoItem[] {
  return sugerirDisposicaoComponentes(layout, itensExemplo)
}

function mockSvgCoordenadas(svg: SVGSVGElement, escala = 1) {
  const plateX = 108
  const plateY = 24
  const ctm = {
    a: escala,
    b: 0,
    c: 0,
    d: escala,
    e: plateX,
    f: plateY,
    inverse: () => ({
      a: 1 / escala,
      b: 0,
      c: 0,
      d: 1 / escala,
      e: -plateX / escala,
      f: -plateY / escala,
    }),
  }
  svg.getScreenCTM = vi.fn(() => ctm as unknown as DOMMatrix)
  svg.createSVGPoint = vi.fn(() => {
    const pt = { x: 0, y: 0 }
    return {
      ...pt,
      matrixTransform(matrix: DOMMatrix) {
        return {
          x: pt.x * matrix.a + matrix.e,
          y: pt.y * matrix.d + matrix.f,
        }
      },
    } as SVGPoint
  })
  svg.setPointerCapture = vi.fn()
  svg.releasePointerCapture = vi.fn()
  svg.hasPointerCapture = vi.fn(() => true)
}

describe('PlacaCanaletasDiagram', () => {
  it('informa quando a placa não tem dimensões', () => {
    const layout = gerarLayoutPlaca(0, 0, 0, 0, 30)
    render(<PlacaCanaletasDiagram layout={layout} />)
    expect(screen.getByText(/Placa sem dimensões para desenho/i)).toBeInTheDocument()
  })

  it('renderiza diagrama SVG com legenda e cotas', () => {
    const layout = layoutPadrao()
    render(<PlacaCanaletasDiagram layout={layout} className="teste-diagrama" />)

    expect(screen.getByRole('img', { name: /Diagrama da placa com canaletas e cotas/i })).toBeInTheDocument()
    expect(screen.getByText(/Verticais —/i)).toBeInTheDocument()
    expect(screen.getByText(/Horizontais —/i)).toBeInTheDocument()
    expect(screen.getByText(/Trilho DIN \(2\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Zona componentes/i)).toBeInTheDocument()
    expect(screen.getAllByText('355 mm').length).toBeGreaterThanOrEqual(1)
    expect(document.querySelector('.teste-diagrama')).toBeTruthy()
  })

  it('exibe componentes e legenda de conflito quando há disposição', () => {
    const layout = layoutPadrao()
    const disposicao = disposicaoExemplo(layout)

    render(
      <PlacaCanaletasDiagram
        layout={layout}
        disposicao={disposicao}
        itensConsiderados={itensExemplo}
      />
    )

    expect(screen.getByText(/Componentes \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText('REL-01')).toBeInTheDocument()
    expect(screen.getByText(/Conflito \(canaleta ou sobreposição\)/i)).toBeInTheDocument()
  })

  it('segmenta trilhos visíveis quando componente em placa ocupa faixa', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 2, 30)
    const disposicao: ComponenteDisposicaoItem[] = [
      {
        instancia_id: 'dcm#0',
        composicao_item_id: 'dcm',
        produto_codigo: '3VJ-LONG',
        produto_descricao: 'Caixa moldada',
        modo_montagem: 'PLACA',
        x_mm: 200,
        y_mm: 80,
        largura_mm: 105,
        altura_mm: 160,
        trilho_indice: null,
        manual: false,
      },
    ]

    render(<PlacaCanaletasDiagram layout={layout} disposicao={disposicao} />)

    expect(screen.getByText(/trechos visíveis/i)).toBeInTheDocument()
  })

  it('permite arrastar componente em modo editável', () => {
    const layout = layoutPadrao()
    const disposicao = disposicaoExemplo(layout)
    const onDisposicaoChange = vi.fn()

    const { container } = render(
      <PlacaCanaletasDiagram
        layout={layout}
        disposicao={disposicao}
        itensConsiderados={itensExemplo}
        editavel
        onDisposicaoChange={onDisposicaoChange}
      />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    mockSvgCoordenadas(svg as SVGSVGElement)

    const compRect = container.querySelector('rect[rx="2"]')
    expect(compRect).toBeTruthy()

    fireEvent.pointerDown(compRect!, {
      pointerId: 1,
      clientX: 150,
      clientY: 120,
      button: 0,
      buttons: 1,
    })

    fireEvent.pointerMove(globalThis.window, {
      pointerId: 1,
      clientX: 180,
      clientY: 140,
      buttons: 1,
    })

    expect(onDisposicaoChange).toHaveBeenCalled()
    const ultima = onDisposicaoChange.mock.calls.at(-1)?.[0] as ComponenteDisposicaoItem[]
    expect(ultima[0].manual).toBe(true)

    fireEvent.pointerUp(globalThis.window, { pointerId: 1, buttons: 0 })
  })

  it('permite arrastar canaleta intermediária em modo editável', () => {
    const layout = layoutPadrao()
    const onLayoutChange = vi.fn()

    const { container } = render(
      <PlacaCanaletasDiagram layout={layout} editavel onLayoutChange={onLayoutChange} />
    )

    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    mockSvgCoordenadas(svg as SVGSVGElement)

    const canaletaIntermediaria = layout.canaletas_horizontais.find((c) => c.arrastavel)
    expect(canaletaIntermediaria).toBeDefined()

    const rects = Array.from(container.querySelectorAll('rect'))
    const alvo = rects.find(
      (rect) => rect.getAttribute('style')?.includes('ns-resize') ?? false
    )
    expect(alvo).toBeTruthy()

    fireEvent.pointerDown(alvo!, {
      pointerId: 2,
      clientX: 120,
      clientY: 200,
      button: 0,
      buttons: 1,
    })

    fireEvent.pointerMove(globalThis.window, {
      pointerId: 2,
      clientX: 120,
      clientY: 170,
      buttons: 1,
    })

    expect(onLayoutChange).toHaveBeenCalled()

    fireEvent.pointerUp(globalThis.window, { pointerId: 2, buttons: 0 })
  })

  it('indica instrução de arraste apenas quando editável', () => {
    const layout = layoutPadrao()
    const disposicao = disposicaoExemplo(layout)

    const { rerender } = render(
      <PlacaCanaletasDiagram layout={layout} disposicao={disposicao} editavel={false} />
    )
    expect(screen.getByText(/passe o mouse para detalhes/i)).toBeInTheDocument()
    expect(screen.queryByText(/arraste para ajustar/i)).not.toBeInTheDocument()

    rerender(
      <PlacaCanaletasDiagram
        layout={layout}
        disposicao={disposicao}
        editavel
        onDisposicaoChange={() => undefined}
      />
    )
    expect(screen.getByText(/arraste para ajustar/i)).toBeInTheDocument()
  })
})
