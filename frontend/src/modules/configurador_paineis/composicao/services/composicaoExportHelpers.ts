/**
 * Funções puras para nomes de ficheiro na exportação (testáveis, sem regex ReDoS).
 */

/** Remove aspas duplas repetidas nas extremidades. */
export function trimAsciiDoubleQuotes(s: string): string {
  let t = s
  while (t.startsWith('"')) t = t.slice(1)
  while (t.endsWith('"')) t = t.slice(0, -1)
  return t
}

/** Interpreta Content-Disposition e devolve o nome do ficheiro ou o fallback. */
export function nomeArquivoContentDisposition(cd: string | undefined, fallback: string): string {
  if (!cd) return fallback
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd)
  if (star) {
    try {
      return decodeURIComponent(trimAsciiDoubleQuotes(star[1].trim()))
    } catch {
      /* ignore */
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd)
  if (quoted) return quoted[1].trim()
  const plain = /filename=([^;\s]+)/i.exec(cd)
  return plain ? trimAsciiDoubleQuotes(plain[1].trim()) : fallback
}

function isCombiningDiacritic(code: number): boolean {
  return code >= 0x0300 && code <= 0x036f
}

function isSlugFilenameChar(ch: string): boolean {
  const c = ch.charCodeAt(0)
  return (
    (c >= 0x61 && c <= 0x7a) ||
    (c >= 0x41 && c <= 0x5a) ||
    (c >= 0x30 && c <= 0x39) ||
    ch === '-' ||
    ch === '_'
  )
}

/** Slug ASCII para nome de ficheiro (acentos removidos depois de NFD). */
export function slugNomeArquivo(valor: string | undefined): string {
  if (!valor) return ''
  const nfd = valor.normalize('NFD')
  let out = ''
  let prevWasSep = false
  for (let i = 0; i < nfd.length; i++) {
    const code = nfd.charCodeAt(i)
    if (isCombiningDiacritic(code)) continue
    const ch = nfd[i]
    if (isSlugFilenameChar(ch)) {
      out += ch
      prevWasSep = false
    } else {
      if (!prevWasSep) {
        out += '_'
        prevWasSep = true
      }
    }
  }
  let start = 0
  let end = out.length
  while (start < end && out[start] === '_') start++
  while (end > start && out[end - 1] === '_') end--
  return out.slice(start, end)
}
