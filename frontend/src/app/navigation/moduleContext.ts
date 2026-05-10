import { findErpModuleByShellSlug } from '@/modules/modulos/moduleCatalog'

export type PortalModuleContext = {
  title: string
}

const CONFIGURADOR_PAINEIS_PATH_PREFIXES = [
  '/dashboard',
  '/projetos',
  '/cargas',
  '/dimensionamento',
  '/composicao',
]

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function getPortalModuleContext(pathname: string): PortalModuleContext {
  const path = pathname || '/'

  if (path === '/') return { title: 'Central de módulos' }
  if (startsWithAny(path, CONFIGURADOR_PAINEIS_PATH_PREFIXES)) {
    return { title: 'Configurador de painéis' }
  }
  if (path === '/catalogo' || path.startsWith('/catalogo/')) {
    return { title: 'Catálogo técnico' }
  }
  if (path === '/tarefas' || path.startsWith('/tarefas/')) {
    return { title: 'Tarefas e Kanban' }
  }
  if (path === '/erp/orcamentos' || path.startsWith('/erp/orcamentos/')) {
    return { title: 'Orçamentos' }
  }
  if (path === '/erp/configuracoes' || path.startsWith('/erp/configuracoes/')) {
    return { title: 'Configurações do ERP' }
  }
  const erpShell = path.match(/^\/erp\/m\/([^/]+)/)
  if (erpShell) {
    const mod = findErpModuleByShellSlug(erpShell[1])
    return { title: mod?.title ?? 'Módulo ERP' }
  }
  if (path === '/administracao' || path.startsWith('/administracao/')) {
    return { title: 'Administração do Portal' }
  }

  return { title: 'Portal ZFW' }
}
