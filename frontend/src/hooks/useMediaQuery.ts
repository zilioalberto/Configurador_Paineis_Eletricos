import { useEffect, useState } from 'react'

/** Observa uma media query CSS (ex.: `(max-width: 1199.98px)`). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof globalThis.window === 'undefined') return false
    return globalThis.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = globalThis.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}
