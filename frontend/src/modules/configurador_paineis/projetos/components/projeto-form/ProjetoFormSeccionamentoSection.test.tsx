import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { projetoFormInitialState } from '@/modules/configurador_paineis/projetos/components/projeto-form/formOptions'
import { ProjetoFormSeccionamentoSection } from '@/modules/configurador_paineis/projetos/components/projeto-form/ProjetoFormSeccionamentoSection'

describe('ProjetoFormSeccionamentoSection', () => {
  it('emite alteração ao mudar tipo de seccionamento', () => {
    const onFieldChange = vi.fn()
    render(
      <div className="row g-3">
        <ProjetoFormSeccionamentoSection
          formData={{
            ...projetoFormInitialState,
            possui_seccionamento: true,
            tipo_seccionamento: 'SECCIONADORA',
          }}
          onFieldChange={onFieldChange}
        />
      </div>
    )

    const tipo = document.querySelector(
      'select[name="tipo_seccionamento"]'
    ) as HTMLSelectElement
    fireEvent.change(tipo, { target: { value: 'SECCIONADORA' } })
    expect(onFieldChange).toHaveBeenCalled()
  })
})
