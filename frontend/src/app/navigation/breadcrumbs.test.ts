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
      { label: 'Cargas do projeto', to: '/cargas' },
      { label: 'Nova carga' },
    ])
    expect(getBreadcrumbItems('/cargas/abc')).toEqual([
      { label: 'Cargas do projeto', to: '/cargas' },
      { label: 'Detalhes da carga' },
    ])
    expect(getBreadcrumbItems('/catalogo')).toEqual([{ label: 'Catálogo' }])
  })
})
