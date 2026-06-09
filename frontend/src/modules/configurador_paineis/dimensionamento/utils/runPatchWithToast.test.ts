import { describe, expect, it, vi } from 'vitest'

import { runPatchWithToast } from './runPatchWithToast'

describe('runPatchWithToast', () => {
  it('exibe toast de sucesso quando a ação resolve', async () => {
    const showToast = vi.fn()
    await runPatchWithToast(
      async () => ({ ok: true }),
      showToast,
      { successMessage: 'Salvo', errorTitle: 'Erro' }
    )

    expect(showToast).toHaveBeenCalledWith({ variant: 'success', message: 'Salvo' })
  })

  it('exibe toast de erro quando a ação falha', async () => {
    const showToast = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await runPatchWithToast(
      async () => {
        throw new Error('falhou')
      },
      showToast,
      { successMessage: 'Salvo', errorTitle: 'Não foi possível salvar' }
    )

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'danger',
        title: 'Não foi possível salvar',
      })
    )
    consoleError.mockRestore()
  })
})
