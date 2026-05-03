export type BreadcrumbItem = {
  label: string
  /** Último item ou página “terminal” não precisa de link */
  to?: string
}

const PLACEHOLDER_LABELS: Record<string, string> = {
  '/catalogo': 'Catálogo',
  '/dimensionamento': 'Dimensionamento de condutores',
  '/composicao': 'Composição do painel',
}

const PROJETO_BASE = { label: 'Projetos', to: '/projetos' } as const
const CARGA_BASE = { label: 'Cargas do projeto', to: '/cargas' } as const

function projetosBreadcrumb(path: string): BreadcrumbItem[] | null {
  if (path === '/projetos') return [PROJETO_BASE]
  if (path === '/projetos/novo') return [PROJETO_BASE, { label: 'Novo projeto' }]
  if (/^\/projetos\/[^/]+\/editar$/.test(path)) {
    return [PROJETO_BASE, { label: 'Editar projeto' }]
  }
  if (/^\/projetos\/[^/]+$/.test(path)) {
    return [PROJETO_BASE, { label: 'Projeto' }]
  }
  return null
}

function cargasBreadcrumb(path: string): BreadcrumbItem[] | null {
  if (path === '/cargas') return [CARGA_BASE]
  if (path === '/cargas/novo') return [CARGA_BASE, { label: 'Nova carga' }]
  if (/^\/cargas\/[^/]+\/editar$/.test(path)) {
    return [CARGA_BASE, { label: 'Editar carga' }]
  }
  if (/^\/cargas\/[^/]+$/.test(path)) {
    return [CARGA_BASE, { label: 'Detalhes da carga' }]
  }
  return null
}

export function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const path = pathname || '/'

  if (path === '/') return [{ label: 'Início', to: '/' }]
  if (path === '/administracao/utilizadores') {
    return [{ label: 'Utilizadores', to: '/administracao/utilizadores' }]
  }

  const fromProjetos = projetosBreadcrumb(path)
  if (fromProjetos) return fromProjetos

  const fromCargas = cargasBreadcrumb(path)
  if (fromCargas) return fromCargas

  const placeholder = PLACEHOLDER_LABELS[path]
  if (placeholder) return [{ label: placeholder }]

  return [{ label: 'Página atual' }]
}
