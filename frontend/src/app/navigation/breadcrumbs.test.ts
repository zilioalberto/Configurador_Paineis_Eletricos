import { describe, expect, it } from 'vitest'

import { getBreadcrumbItems } from '@/app/navigation/breadcrumbs'

describe('getBreadcrumbItems', () => {
  it('resolve trilha de projetos', () => {
    expect(getBreadcrumbItems('/projetos/novo')).toEqual([
      { label: 'Projetos', to: '/projetos' },
      { label: 'Novo projeto' },
    ])
    expect(getBreadcrumbItems('/projetos/abc/editar')).toEqual([
      { label: 'Projetos', to: '/projetos' },
      { label: 'Editar projeto' },
    ])
    expect(getBreadcrumbItems('/projetos/abc')).toEqual([
      { label: 'Projetos', to: '/projetos' },
      { label: 'Projeto' },
    ])
  })

  it('resolve trilha de cargas e placeholders', () => {
    expect(getBreadcrumbItems('/cargas/novo')).toEqual([
      { label: 'Cargas do Projeto', to: '/cargas' },
      { label: 'Nova carga' },
    ])
    expect(getBreadcrumbItems('/cargas/abc')).toEqual([
      { label: 'Cargas do Projeto', to: '/cargas' },
      { label: 'Detalhes da carga' },
    ])
    expect(getBreadcrumbItems('/catalogo')).toEqual([{ label: 'Catálogo' }])
    expect(getBreadcrumbItems('/tarefas')).toEqual([{ label: 'Tarefas e Kanban' }])
    expect(getBreadcrumbItems('/tarefas/horas-gestao')).toEqual([
      { label: 'Tarefas e Kanban', to: '/tarefas' },
      { label: 'Gestão de horas' },
    ])
  })

  it('resolve trilhas ERP', () => {
    expect(getBreadcrumbItems('/erp/cadastros')).toEqual([{ label: 'Cadastros' }])
    expect(getBreadcrumbItems('/erp/rh')).toEqual([{ label: 'RH' }])
    expect(getBreadcrumbItems('/erp/orcamentos')).toEqual([{ label: 'Orçamentos' }])
    expect(getBreadcrumbItems('/erp/orcamentos/abc-uuid')).toEqual([
      { label: 'Orçamentos', to: '/erp/orcamentos' },
      { label: 'Detalhe do orçamento' },
    ])
    expect(getBreadcrumbItems('/erp/configuracoes')).toEqual([{ label: 'Configurações do ERP' }])
    expect(getBreadcrumbItems('/erp/m/crm')).toEqual([{ label: 'CRM' }])
  })
})
