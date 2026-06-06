const ORIGEM_KEYS = ['orcamento', 'vinculo'] as const

export function getFluxoOrigemSearch(searchParams: URLSearchParams): URLSearchParams {
  const origem = new URLSearchParams()
  ORIGEM_KEYS.forEach((key) => {
    const value = searchParams.get(key)
    if (value) origem.set(key, value)
  })
  return origem
}

export function withFluxoOrigem(path: string, searchParams: URLSearchParams): string {
  const origem = getFluxoOrigemSearch(searchParams)
  if (Array.from(origem).length === 0) return path

  const hashIndex = path.indexOf('#')
  const base = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}${origem.toString()}${hash}`
}
