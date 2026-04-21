import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function ToastTrigger() {
  const { showToast } = useToast()
  return (
    <>
      <button
        type="button"
        onClick={() =>
          showToast({
            variant: 'success',
            title: 'Ok',
            message: 'Guardado com sucesso.',
          })
        }
      >
        toast-title
      </button>
      <button
        type="button"
        onClick={() =>
          showToast({ variant: 'info', message: 'Só mensagem', durationMs: 0 })
        }
      >
        toast-plain
      </button>
    </>
  )
}

describe('ToastProvider', () => {
  it('mostra toast com título e permite fechar manualmente', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'toast-title' }))
    expect(screen.getByText('Guardado com sucesso.')).toBeInTheDocument()
    expect(screen.getByText('Ok')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Fechar notificação/i })
    )
    expect(screen.queryByText('Guardado com sucesso.')).not.toBeInTheDocument()
  })

  it('mostra toast só com mensagem', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'toast-plain' }))
    expect(screen.getByText('Só mensagem')).toBeInTheDocument()
  })

  it('lança se useToast for usado fora do provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ToastTrigger />)).toThrow(
      /useToast deve ser usado dentro de ToastProvider/
    )
    spy.mockRestore()
  })
})
