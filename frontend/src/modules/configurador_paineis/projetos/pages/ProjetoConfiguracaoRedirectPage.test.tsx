import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import ProjetoConfiguracaoRedirectPage from './ProjetoConfiguracaoRedirectPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/configurador/configuracoes" element={<div>Página configurações</div>} />
        <Route path="/configurador/configuracoes/:id" element={<ProjetoConfiguracaoRedirectPage />} />
        <Route path="/configurador/cargas" element={<div>Cargas do projeto</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProjetoConfiguracaoRedirectPage', () => {
  it('redireciona para cargas quando há id', async () => {
    renderAt('/configurador/configuracoes/proj-99')

    expect(await screen.findByText('Cargas do projeto')).toBeInTheDocument()
  })

  it('redireciona para listagem de configurações sem id', async () => {
    render(
      <MemoryRouter initialEntries={['/configurador/configuracoes/']}>
        <Routes>
          <Route path="/configurador/configuracoes/*" element={<ProjetoConfiguracaoRedirectPage />} />
          <Route path="/configurador/configuracoes" element={<div>Página configurações</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Página configurações')).toBeInTheDocument()
  })
})
