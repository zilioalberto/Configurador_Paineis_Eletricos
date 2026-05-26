import type { ReactElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { projetoFormInitialState } from '@/modules/configurador_paineis/projetos/components/projeto-form/formOptions'
import { ProjetoFormDadosGeraisSection } from '@/modules/configurador_paineis/projetos/components/projeto-form/ProjetoFormDadosGeraisSection'

function renderSection(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <div className="row g-3">{ui}</div>
    </MemoryRouter>
  )
}

describe('ProjetoFormDadosGeraisSection', () => {
  it('altera nome e cliente via select do cadastro', () => {
    const onFieldChange = vi.fn()
    renderSection(
          <ProjetoFormDadosGeraisSection
            formData={{ ...projetoFormInitialState, nome: 'A', cliente: '' }}
            onFieldChange={onFieldChange}
            responsavelOptions={[]}
            clienteOptions={[
              { value: 'Cliente X', label: 'Cliente X (11.111.111/0001-11)' },
            ]}
            canEditResponsavel={false}
            showStatus
            readOnlyExceptStatus={false}
          />
    )

    fireEvent.change(document.querySelector('input[name="nome"]')!, {
      target: { value: 'Novo' },
    })
    expect(onFieldChange).toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Cliente'), {
      target: { value: 'Cliente X' },
    })
    expect(onFieldChange).toHaveBeenCalled()
  })

  it('mostra hint de bloqueio quando finalizado', () => {
    renderSection(
        <ProjetoFormDadosGeraisSection
          formData={{
            ...projetoFormInitialState,
            status: 'FINALIZADO',
            nome: 'P',
          }}
          onFieldChange={vi.fn()}
          readOnlyExceptStatus
          showStatus
        />
    )
    expect(screen.getByRole('status')).toHaveTextContent(/Finalizado/)
  })

  it('renderiza opções de responsável quando permitido', () => {
    renderSection(
        <ProjetoFormDadosGeraisSection
          formData={{ ...projetoFormInitialState, responsavel: 1 }}
          onFieldChange={vi.fn()}
          responsavelOptions={[
            { id: 1, label: 'Maria Gestora', email: 'maria@test.com', tipo_usuario: 'USUARIO' },
          ]}
          canEditResponsavel
          showStatus={false}
          readOnlyExceptStatus={false}
        />
    )

    expect(screen.getByRole('option', { name: 'Maria Gestora' })).toBeInTheDocument()
    const responsavelSelect = screen
      .getAllByRole('combobox')
      .find((el) => el.getAttribute('name') === 'responsavel')
    expect(responsavelSelect).toBeTruthy()
    expect(responsavelSelect).toBeEnabled()
  })
})
