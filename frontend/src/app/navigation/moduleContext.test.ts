import { beforeEach, describe, expect, it, vi } from 'vitest'

const findErpModuleByShellSlug = vi.hoisted(() => vi.fn())

vi.mock('@/modules/modulos/moduleCatalog', () => ({
  findErpModuleByShellSlug: (...args: unknown[]) => findErpModuleByShellSlug(...args),
}))

import { getPortalModuleContext } from './moduleContext'

describe('getPortalModuleContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['/', 'Central de módulos'],
    ['', 'Central de módulos'],
    ['/configurador', 'Configurador de painéis'],
    ['/configurador/configuracoes', 'Configurador de painéis'],
    ['/configurador/configuracoes/p1/fluxo/cargas', 'Configurador de painéis'],
    ['/dashboard', 'Configurador de painéis'],
    ['/dashboard/resumo', 'Configurador de painéis'],
    ['/projetos', 'Configurador de painéis'],
    ['/cargas', 'Configurador de painéis'],
    ['/dimensionamento', 'Configurador de painéis'],
    ['/composicao', 'Configurador de painéis'],
    ['/composicao/p1', 'Configurador de painéis'],
    ['/catalogo', 'Catálogo'],
    ['/catalogo/produtos', 'Catálogo'],
    ['/tarefas', 'Tarefas e Kanban'],
    ['/tarefas/kanban', 'Tarefas e Kanban'],
    ['/erp/cadastros', 'Cadastros'],
    ['/erp/cadastros/foo', 'Cadastros'],
    ['/erp/rh', 'RH'],
    ['/erp/rh/colaboradores', 'RH'],
    ['/erp/orcamentos', 'Orçamentos'],
    ['/erp/orcamentos/1', 'Orçamentos'],
    ['/orcamentos', 'Orçamentos'],
    ['/orcamentos/1', 'Orçamentos'],
    ['/erp/configuracoes', 'Configurações do ERP'],
    ['/erp/configuracoes/geral', 'Configurações do ERP'],
    ['/administracao', 'Administração do Portal'],
    ['/administracao/usuarios', 'Administração do Portal'],
    ['/outro/caminho', 'Portal ZFW'],
  ])('pathname %s → %s', (pathname, title) => {
    expect(getPortalModuleContext(pathname).title).toBe(title)
  })

  it('usa título do catálogo ERP quando o slug existe', () => {
    findErpModuleByShellSlug.mockReturnValue({ title: 'Compras ERP' })
    expect(getPortalModuleContext('/erp/m/compras').title).toBe('Compras ERP')
    expect(findErpModuleByShellSlug).toHaveBeenCalledWith('compras')
  })

  it('usa título genérico quando slug ERP não existe no catálogo', () => {
    findErpModuleByShellSlug.mockReturnValue(undefined)
    expect(getPortalModuleContext('/erp/m/desconhecido').title).toBe('Módulo ERP')
  })
})
