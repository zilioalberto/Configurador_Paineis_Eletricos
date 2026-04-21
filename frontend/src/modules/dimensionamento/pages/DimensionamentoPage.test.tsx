import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import DimensionamentoPage from '@/modules/dimensionamento/pages/DimensionamentoPage'

function renderDimensionamentoRedirect(initialEntry: string, destinationText: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dimensionamento" element={<DimensionamentoPage />} />
        <Route path="/cargas" element={<div>{destinationText}</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DimensionamentoPage', () => {
  it('redireciona para cargas sem projeto', () => {
    renderDimensionamentoRedirect('/dimensionamento', 'Destino cargas')

    expect(screen.getByText('Destino cargas')).toBeInTheDocument()
  })

  it('redireciona para cargas com projeto e ancora do resumo', () => {
    renderDimensionamentoRedirect('/dimensionamento?projeto=p1', 'Destino cargas projeto')

    expect(screen.getByText('Destino cargas projeto')).toBeInTheDocument()
  })

  it('mantem compatibilidade da rota antiga', () => {
    renderDimensionamentoRedirect('/dimensionamento?projeto=abc-123', 'Compatibilidade ok')

    expect(screen.getByText('Compatibilidade ok')).toBeInTheDocument()
  })
})
