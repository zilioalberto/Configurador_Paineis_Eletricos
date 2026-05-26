import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AppPageToolbar from './AppPageToolbar'
import {
  AppPageToolbarProvider,
  useAppPageToolbar,
  useAppPageToolbarState,
} from './AppPageToolbarContext'

function ToolbarProbe() {
  const toolbar = useAppPageToolbarState()
  return toolbar ? <AppPageToolbar toolbar={toolbar} /> : null
}

function PageWithAction({ disabled }: Readonly<{ disabled: boolean }>) {
  useAppPageToolbar({
    title: 'Página',
    actionsKey: disabled ? 'disabled' : 'enabled',
    actions: (
      <button type="button" disabled={disabled}>
        Ação dinâmica
      </button>
    ),
  })
  return null
}

describe('useAppPageToolbar', () => {
  it('atualiza actions quando somente o estado do botão muda', () => {
    const view = render(
      <AppPageToolbarProvider>
        <ToolbarProbe />
        <PageWithAction disabled />
      </AppPageToolbarProvider>
    )

    expect(screen.getByRole('button', { name: 'Ação dinâmica' })).toBeDisabled()

    view.rerender(
      <AppPageToolbarProvider>
        <ToolbarProbe />
        <PageWithAction disabled={false} />
      </AppPageToolbarProvider>
    )

    expect(screen.getByRole('button', { name: 'Ação dinâmica' })).toBeEnabled()
  })
})
