/**
 * URLs de ficheiros estáticos em `public/branding/`.
 * Usa `import.meta.env.BASE_URL` para funcionar com deploy em subcaminho (Vite).
 */
function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${base}${normalized}`.replace(/\/{2,}/g, '/')
}

/** Logo principal ZFW (PNG em `public/branding/zfw-logo.png`). */
export const ZFW_LOGO_PNG_URL = publicUrl('branding/zfw-logo.png')
