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

  it('recalcula IO do motor ao alterar tipo de partida na edição', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.tag = 'M01'
    initial.descricao = 'Motor editado'
    initial.exige_comando = true
    initial.quantidade_entradas_digitais = 1
    initial.quantidade_saidas_digitais = 1
    if (initial.motor) {
      initial.motor.tipo_partida = 'DIRETA'
      initial.motor.reversivel = false
      initial.motor.freio_motor = false
    }

    render(
      <CargaForm
        projetos={[
          {
            id: 'proj-1',
            nome: 'P',
            codigo: 'C-1',
            status: 'EM_ANDAMENTO',
            possui_plc: true,
          } as import('@/modules/projetos/types/projeto').Projeto,
        ]}
        initialData={initial}
        onSubmit={onSubmit}
        lockProjeto
      />
    )

    const tipoPartida = screen
      .getAllByRole('combobox')
      .find((el) => (el as HTMLSelectElement).value === 'DIRETA')
    expect(tipoPartida).toBeDefined()
    if (!tipoPartida) throw new Error('Campo tipo_partida não encontrado')
    fireEvent.change(tipoPartida, { target: { value: 'ESTRELA_TRIANGULO' } })

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Saídas digitais/i) as HTMLInputElement).value
      ).toBe('3')
    })
  })

  it('zera e desabilita quantidades de IO quando exige comando fica false', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.tag = 'M10'
    initial.descricao = 'Motor sem comando'
    initial.exige_comando = true

    render(
      <CargaForm
        projetos={[
          {
            id: 'proj-1',
            nome: 'P',
            codigo: 'C-1',
            status: 'EM_ANDAMENTO',
            possui_plc: true,
          } as import('@/modules/projetos/types/projeto').Projeto,
        ]}
        initialData={initial}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByLabelText(/Exige comando/i))

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Entradas digitais/i) as HTMLInputElement).value
      ).toBe('0')
      expect(
        (screen.getByLabelText(/Saídas digitais/i) as HTMLInputElement).value
      ).toBe('0')
      expect(screen.getByLabelText(/Entradas digitais/i)).toBeDisabled()
      expect(screen.getByLabelText(/Saídas digitais/i)).toBeDisabled()
    })
  })
})
