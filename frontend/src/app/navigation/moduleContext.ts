import { findErpModuleByShellSlug } from '@/modules/modulos/moduleCatalog'

export type PortalModuleContext = {
  title: string
}

const CONFIGURADOR_PAINEIS_PATH_PREFIXES = [
  '/configurador',
  '/dashboard',
  '/projetos',
  '/cargas',
  '/dimensionamento',
  '/composicao',
]
const ERP_SHELL_RE = /^\/erp\/m\/([^/]+)/

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function getPortalModuleContext(path = '/'): PortalModuleContext {
  if (path === '/' || path === '') return { title: 'Central de módulos' }
  if (startsWithAny(path, CONFIGURADOR_PAINEIS_PATH_PREFIXES)) {
    return { title: 'Configurador de painéis' }
  }
  if (path === '/catalogo' || path.startsWith('/catalogo/')) {
    return { title: 'Catálogo' }
  }
  if (path === '/tarefas' || path.startsWith('/tarefas/')) {
    return { title: 'Tarefas e Kanban' }
  }
  if (path === '/erp/cadastros' || path.startsWith('/erp/cadastros/')) {
    return { title: 'Cadastros' }
  }
  if (path === '/erp/rh' || path.startsWith('/erp/rh/')) {
    return { title: 'RH' }
  }
  if (
    path === '/erp/orcamentos' ||
    path.startsWith('/erp/orcamentos/') ||
    path === '/orcamentos' ||
    path.startsWith('/orcamentos/')
  ) {
    return { title: 'Orçamentos' }
  }
  if (path === '/erp/configuracoes' || path.startsWith('/erp/configuracoes/')) {
    return { title: 'Configurações do ERP' }
  }
  const erpShell = ERP_SHELL_RE.exec(path)
  if (erpShell) {
    const mod = findErpModuleByShellSlug(erpShell[1])
    return { title: mod?.title ?? 'Módulo ERP' }
  }
  if (path === '/administracao' || path.startsWith('/administracao/')) {
    return { title: 'Administração do Portal' }
  }

  return { title: 'Portal ZFW' }
}
