export type PortalModuleContext = {
  title: string
}

const CONFIGURADOR_PATH_PREFIXES = [
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
  if (startsWithAny(path, CONFIGURADOR_PATH_PREFIXES)) {
    return { title: 'Configurador de Painéis' }
  }
  if (path === '/catalogo' || path.startsWith('/catalogo/')) {
    return { title: 'Catálogo Técnico' }
  }
  if (path === '/administracao' || path.startsWith('/administracao/')) {
    return { title: 'Administração do Portal' }
  }

  return { title: 'Portal ZFW' }
}
