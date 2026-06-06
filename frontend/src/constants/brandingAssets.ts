/**
 * Identidade visual ZFW e ficheiros em `public/branding/`.
 */
function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${base}${normalized}`.replaceAll(/\/{2,}/g, '/')
}

/** Cores da marca ZFW (logo / interface). */
export const ZFW_BRAND = {
  azul: '#00407A',
  azulClaro: '#1a5f94',
  verde: '#5BA183',
  verdeClaro: '#9BC6B2',
  verdeEscuro: '#3d7a62',
  branco: '#ffffff',
  texto: '#1e293b',
  textoSuave: '#475569',
} as const

/** Paleta suave para documentos comerciais (proposta ao cliente). */
export const ZFW_DOC_THEME = {
  azul: '#3d6d8c',
  azulEscuro: '#2f5873',
  verde: '#6f9f8a',
  verdeSuave: '#e8f2ec',
  azulSuave: '#eef4f8',
  fundo: '#fafbfc',
  cartao: '#ffffff',
  borda: '#e4eaef',
  bordaSuave: '#eef2f6',
  texto: '#2d3a4a',
  textoSuave: '#6b7d92',
  destaque: '#f6f9fb',
} as const

/** Logo vetorial (fundo transparente) — preferido em documentos. */
export const ZFW_LOGO_SVG_URL = publicUrl('branding/zfw-logo.svg')

/** Logo completo (símbolo + ENGENHARIA). */
export const ZFW_LOGO_ENGENHARIA_URL = publicUrl('branding/zfw-logo-engenharia.png')

/** Símbolo ZFW (losango). */
export const ZFW_LOGO_SIMBOLO_URL = publicUrl('branding/zfw-logo-simbolo.png')

/** Compatibilidade com usos antigos. */
export const ZFW_LOGO_PNG_URL = publicUrl('branding/zfw-logo.png')
