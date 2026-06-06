import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const obterErpModuleMeta = vi.hoisted(() => vi.fn())

vi.mock('../services/orcamentosApi', () => ({
  obterErpModuleMeta: (...args: unknown[]) => obterErpModuleMeta(...args),
}))

vi.mock('@/modules/modulos/moduleCatalog', () => ({
  findErpModuleByShellSlug: (slug: string) => ({
    id: slug,
    title: `Catálogo ${slug}`,
  }),
}))

import ErpModuleShellPage from './ErpModuleShellPage'

function renderPage(path = '/erp/modulos/compras') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/erp/modulos/:moduleId" element={<ErpModuleShellPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ErpModuleShellPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterErpModuleMeta.mockResolvedValue({
      area: 'ERP',
      title: 'Compras',
      summary: 'Gestão de compras',
      backend_package: 'apps.compras',
      notes: 'Em evolução',
    })
  })

  it('carrega metadados do módulo', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Compras' })).toBeInTheDocument()
    expect(screen.getByText('apps.compras')).toBeInTheDocument()
    expect(obterErpModuleMeta).toHaveBeenCalledWith('compras')
  })

  it('mostra erro quando metadados falham', async () => {
    obterErpModuleMeta.mockRejectedValueOnce(new Error('falhou'))

    renderPage('/erp/modulos/financeiro')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível carregar os metadados deste módulo.'
      )
    })
    expect(screen.queryByRole('heading', { name: 'Financeiro' })).not.toBeInTheDocument()
  })
})
