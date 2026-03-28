export type BreadcrumbItem = {
  label: string
  /** Último item ou página “terminal” não precisa de link */
  to?: string
}

const PLACEHOLDER_LABELS: Record<string, string> = {
  '/catalogo': 'Catálogo',
  '/dimensionamento': 'Dimensionamento',
  '/composicao': 'Composição do painel',
}

export function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const path = pathname === '' ? '/' : pathname

  if (path === '/') {
    return [{ label: 'Início', to: '/' }]
  }

  if (path === '/projetos') {
    return [{ label: 'Projetos', to: '/projetos' }]
  }

  if (path === '/projetos/novo') {
    return [
      { label: 'Projetos', to: '/projetos' },
      { label: 'Novo projeto' },
    ]
  }

  if (/^\/projetos\/[^/]+\/editar$/.test(path)) {
    return [
      { label: 'Projetos', to: '/projetos' },
      { label: 'Editar projeto' },
    ]
  }

  if (/^\/projetos\/[^/]+$/.test(path)) {
    const segment = path.split('/')[2]
    if (segment === 'novo') {
      return [
        { label: 'Projetos', to: '/projetos' },
        { label: 'Novo projeto' },
      ]
    }
    return [
      { label: 'Projetos', to: '/projetos' },
      { label: 'Detalhes do projeto' },
    ]
  }

  if (path === '/cargas') {
    return [{ label: 'Cargas', to: '/cargas' }]
  }

  if (path === '/cargas/novo') {
    return [
      { label: 'Cargas', to: '/cargas' },
      { label: 'Nova carga' },
    ]
  }

  if (/^\/cargas\/[^/]+\/editar$/.test(path)) {
    return [
      { label: 'Cargas', to: '/cargas' },
      { label: 'Editar carga' },
    ]
  }

  if (/^\/cargas\/[^/]+$/.test(path)) {
    const segment = path.split('/')[2]
    if (segment === 'novo') {
      return [
        { label: 'Cargas', to: '/cargas' },
        { label: 'Nova carga' },
      ]
    }
    return [
      { label: 'Cargas', to: '/cargas' },
      { label: 'Detalhes da carga' },
    ]
  }

  const placeholder = PLACEHOLDER_LABELS[path]
  if (placeholder) {
    return [{ label: placeholder }]
  }

  return [{ label: 'Página atual' }]
}
