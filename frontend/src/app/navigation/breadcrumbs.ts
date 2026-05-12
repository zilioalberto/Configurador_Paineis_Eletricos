import { findErpModuleByShellSlug } from '@/modules/modulos/moduleCatalog'

export type BreadcrumbItem = {
  label: string
  /** Último item ou página “terminal” não precisa de link */
  to?: string
}

const PLACEHOLDER_LABELS: Record<string, string> = {
  '/dashboard': 'Painel do configurador',
  '/catalogo': 'Catálogo',
<<<<<<< HEAD
  '/tarefas': 'Tarefas e Kanban',
  '/dimensionamento': 'Dimensionamento de condutores',
  '/composicao': 'Composição do Painel',
=======
  '/dimensionamento': 'Dimensionamento de condutores',
  '/composicao': 'Composição do painel',
>>>>>>> origin/main
}
const PROJETO_BASE = { label: 'Projetos', to: '/projetos' } as const
<<<<<<< HEAD
const CARGA_BASE = { label: 'Cargas do Projeto', to: '/cargas' } as const
=======
const CARGA_BASE = { label: 'Cargas do projeto', to: '/cargas' } as const
>>>>>>> origin/main

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

  if (path === '/') return [{ label: 'Portal ZFW', to: '/' }]

  if (path === '/tarefas/horas-gestao') {
    return [
      { label: 'Tarefas e Kanban', to: '/tarefas' },
      { label: 'Gestão de horas' },
    ]
  }
  if (path === '/administracao/utilizadores') {
    return [{ label: 'Utilizadores', to: '/administracao/utilizadores' }]
  }

  if (path === '/erp/orcamentos') {
    return [{ label: 'Orçamentos' }]
  }
  if (path === '/erp/cadastros') {
    return [{ label: 'Cadastros' }]
  }
  if (path === '/erp/rh') {
    return [{ label: 'RH' }]
  }
  if (/^\/erp\/orcamentos\/[^/]+$/.test(path)) {
    return [
      { label: 'Orçamentos', to: '/erp/orcamentos' },
      { label: 'Detalhe do orçamento' },
    ]
  }
  if (path === '/erp/configuracoes' || path.startsWith('/erp/configuracoes/')) {
    return [{ label: 'Configurações do ERP' }]
  }
  if (path === '/fiscal') {
    return [{ label: 'Fiscal' }]
  }
  if (path === '/fiscal/itens-fiscais') {
    return [
      { label: 'Fiscal', to: '/fiscal' },
      { label: 'Itens fiscais' },
    ]
  }
  const erpShell = path.match(/^\/erp\/m\/([^/]+)/)
  if (erpShell) {
    const mod = findErpModuleByShellSlug(erpShell[1])
    return [{ label: mod?.title ?? 'Módulo ERP' }]
  }

  const fromProjetos = projetosBreadcrumb(path)
  if (fromProjetos) return fromProjetos

  const fromCargas = cargasBreadcrumb(path)
  if (fromCargas) return fromCargas

  const placeholder = PLACEHOLDER_LABELS[path]
  if (placeholder) return [{ label: placeholder }]

  return [{ label: 'Página atual' }]
}
