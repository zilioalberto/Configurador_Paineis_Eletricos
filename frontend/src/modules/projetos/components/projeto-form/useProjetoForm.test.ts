import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent, SyntheticEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { projetoFormInitialState } from '@/modules/projetos/components/projeto-form/formOptions'
import { useProjetoForm } from '@/modules/projetos/components/projeto-form/useProjetoForm'

describe('useProjetoForm', () => {
  it('submete payload normalizado', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useProjetoForm({ onSubmit, initialData: projetoFormInitialState }))

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as SyntheticEvent<HTMLFormElement>)
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.nome).toBe('')
    expect(payload.tipo_seccionamento).toBeNull()
  })

  it('ao mudar tipo_corrente para CA preenche fases e frequência quando null', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() =>
      useProjetoForm({
        onSubmit,
        initialData: {
          ...projetoFormInitialState,
          tipo_corrente: 'CC',
          numero_fases: null,
          frequencia: null,
        },
      })
    )

    act(() => {
      result.current.handleFieldChange({
        target: { name: 'tipo_corrente', value: 'CA', type: 'text' },
      } as unknown as ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.formData.numero_fases).toBe(3)
    expect(result.current.formData.frequencia).toBe(60)
  })

  it('ao desmarcar possui_seccionamento zera tipo_seccionamento', () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() =>
      useProjetoForm({
        onSubmit,
        initialData: {
          ...projetoFormInitialState,
          possui_seccionamento: true,
          tipo_seccionamento: 'SECCIONADORA',
        },
      })
    )

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.name = 'possui_seccionamento'
    cb.checked = false

    act(() => {
      result.current.handleFieldChange({
        target: cb,
      } as unknown as ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.formData.possui_seccionamento).toBe(false)
    expect(result.current.formData.tipo_seccionamento).toBeNull()
  })
})
