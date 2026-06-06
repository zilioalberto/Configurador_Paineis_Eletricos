import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AssinaturaCanvas from './AssinaturaCanvas'

describe('AssinaturaCanvas', () => {
  it('renderiza área de assinatura e botão limpar', () => {
    const onChange = vi.fn()
    render(<AssinaturaCanvas onChange={onChange} />)

    expect(screen.getByLabelText('Área de assinatura')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /limpar assinatura/i })).toBeInTheDocument()
  })

  it('emite data URL ao desenhar e limpa ao clicar em Limpar', () => {
    const onChange = vi.fn()
    const { container } = render(<AssinaturaCanvas onChange={onChange} />)
    const canvas = screen.getByLabelText('Área de assinatura') as HTMLCanvasElement

    vi.spyOn(canvas, 'getContext').mockReturnValue({
      strokeStyle: '',
      lineWidth: 0,
      lineCap: 'round',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc')
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 480,
      height: 120,
      right: 480,
      bottom: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 })
    fireEvent.mouseUp(canvas)

    expect(onChange).toHaveBeenCalledWith('data:image/png;base64,abc')

    fireEvent.click(screen.getByRole('button', { name: /limpar assinatura/i }))
    expect(onChange).toHaveBeenCalledWith('')
    expect(container.querySelector('.assinatura-canvas')).toBeInTheDocument()
  })

  it('não desenha quando disabled', () => {
    const onChange = vi.fn()
    render(<AssinaturaCanvas onChange={onChange} disabled />)

    const canvas = screen.getByLabelText('Área de assinatura')
    fireEvent.mouseDown(canvas, { clientX: 5, clientY: 5 })
    fireEvent.mouseMove(canvas, { clientX: 15, clientY: 15 })

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /limpar assinatura/i })).toBeDisabled()
  })
})
