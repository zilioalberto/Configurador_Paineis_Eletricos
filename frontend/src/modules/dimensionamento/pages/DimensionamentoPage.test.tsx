import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import DimensionamentoPage from '@/modules/dimensionamento/pages/DimensionamentoPage'

describe('DimensionamentoPage', () => {
  it('redireciona para cargas sem projeto', () => {
    render(
      <MemoryRouter initialEntries={['/dimensionamento']}>
        <Routes>
          <Route path="/dimensionamento" element={<DimensionamentoPage />} />
          <Route path="/cargas" element={<div>Destino cargas</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Destino cargas')).toBeInTheDocument()
  })

  it('redireciona para cargas com projeto e ancora do resumo', () => {
    render(
      <MemoryRouter initialEntries={['/dimensionamento?projeto=p1']}>
        <Routes>
          <Route path="/dimensionamento" element={<DimensionamentoPage />} />
          <Route path="/cargas" element={<div>Destino cargas projeto</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Destino cargas projeto')).toBeInTheDocument()
  })

  it('mantem compatibilidade da rota antiga', () => {
    render(
      <MemoryRouter initialEntries={['/dimensionamento?projeto=abc-123']}>
        <Routes>
          <Route path="/dimensionamento" element={<DimensionamentoPage />} />
          <Route path="/cargas" element={<div>Compatibilidade ok</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Compatibilidade ok')).toBeInTheDocument()
  })
})
