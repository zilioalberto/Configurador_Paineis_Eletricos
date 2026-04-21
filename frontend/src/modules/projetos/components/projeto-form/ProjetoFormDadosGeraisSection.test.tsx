import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { projetoFormInitialState } from '@/modules/projetos/components/projeto-form/formOptions'
import { ProjetoFormDadosGeraisSection } from '@/modules/projetos/components/projeto-form/ProjetoFormDadosGeraisSection'

describe('ProjetoFormDadosGeraisSection', () => {
  it('altera nome e cliente', () => {
    const onFieldChange = vi.fn()
    render(
      <div className="row g-3">
        <ProjetoFormDadosGeraisSection
          formData={{ ...projetoFormInitialState, nome: 'A', cliente: 'B' }}
          onFieldChange={onFieldChange}
          responsavelOptions={[]}
          canEditResponsavel={false}
          showStatus
          readOnlyExceptStatus={false}
        />
      </div>
    )

    fireEvent.change(document.querySelector('input[name="nome"]')!, {
      target: { value: 'Novo' },
    })
    expect(onFieldChange).toHaveBeenCalled()

    fireEvent.change(document.querySelector('input[name="cliente"]')!, {
      target: { value: 'Cliente X' },
    })
    expect(screen.getByText(/Nome/i)).toBeInTheDocument()
  })

  it('mostra hint de bloqueio quando finalizado', () => {
    render(
      <div className="row g-3">
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
      </div>
    )
    expect(screen.getByRole('status')).toHaveTextContent(/Finalizado/)
  })
})
