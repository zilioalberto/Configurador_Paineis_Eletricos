import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CargaForm from '@/modules/cargas/components/CargaForm'
import { cargaFormInitial } from '@/modules/cargas/utils/cargaFormDefaults'

const onSubmit = vi.fn().mockResolvedValue(undefined)

describe('CargaForm', () => {
  it('submete dados quando válidos', async () => {
    onSubmit.mockClear()
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'Motor principal'
    initial.tag = 'M01'

    render(
      <CargaForm
        projetos={[
          {
            id: 'proj-1',
            nome: 'P',
            codigo: 'C-1',
            status: 'EM_ANDAMENTO',
            possui_plc: false,
          } as import('@/modules/projetos/types/projeto').Projeto,
        ]}
        initialData={initial}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Salvar carga/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].projeto).toBe('proj-1')
    expect(onSubmit.mock.calls[0][0].descricao).toBe('Motor principal')
  })

  it('aplica tag sugerida quando o campo ainda está vazio', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.tag = ''

    const { rerender } = render(
      <CargaForm
        projetos={[
          {
            id: 'proj-1',
            nome: 'P',
            codigo: 'C-1',
            status: 'EM_ANDAMENTO',
            possui_plc: false,
          } as import('@/modules/projetos/types/projeto').Projeto,
        ]}
        initialData={initial}
        onSubmit={onSubmit}
        suggestedTag="M02"
      />
    )

    await waitFor(() => {
      expect((screen.getByPlaceholderText(/M01/i) as HTMLInputElement).value).toBe('M02')
    })

    rerender(
      <CargaForm
        projetos={[
          {
            id: 'proj-1',
            nome: 'P',
            codigo: 'C-1',
            status: 'EM_ANDAMENTO',
            possui_plc: false,
          } as import('@/modules/projetos/types/projeto').Projeto,
        ]}
        initialData={initial}
        onSubmit={onSubmit}
        suggestedTag="M03"
      />
    )

    await waitFor(() => {
      expect((screen.getByPlaceholderText(/M01/i) as HTMLInputElement).value).toBe('M03')
    })
  })
})
