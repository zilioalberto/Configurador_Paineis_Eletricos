import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmModal } from './ConfirmModal'

describe('ConfirmModal', () => {
  it('não renderiza nada quando show é false', () => {
    const { container } = render(
      <ConfirmModal
        show={false}
        title="T"
        message="M"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('exibe título, mensagem e chama onConfirm / onCancel', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        show
        title="Excluir?"
        message="Isto não pode ser desfeito."
        confirmLabel="Excluir"
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmVariant="danger"
      />
    )
    expect(screen.getByRole('heading', { name: 'Excluir?' })).toBeInTheDocument()
    expect(
      screen.getByText('Isto não pode ser desfeito.')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('tecla Escape chama onCancel quando não está a confirmar', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        show
        title="T"
        message="M"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})
