import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppInfoModal } from './AppInfoModal'

describe('AppInfoModal', () => {
  it('não renderiza quando show é false', () => {
    const { container } = render(
      <AppInfoModal show={false} title="T" onClose={vi.fn()}>
        <p>Corpo</p>
      </AppInfoModal>
    )
    expect(container.firstChild).toBeNull()
  })

  it('fecha com botões, backdrop e Escape', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AppInfoModal show title="Sobre" titleId="sobre-title" onClose={onClose}>
        <span>Detalhes da app</span>
      </AppInfoModal>
    )
    expect(screen.getByRole('heading', { name: 'Sobre' })).toBeInTheDocument()
    expect(screen.getByText('Detalhes da app')).toBeInTheDocument()

    fireEvent.click(container.querySelector('.modal-footer .btn-primary')!)
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    fireEvent.click(container.querySelector('.modal-header .btn-close')!)
    expect(onClose).toHaveBeenCalled()

    onClose.mockClear()
    fireEvent.click(container.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalled()

    onClose.mockClear()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
