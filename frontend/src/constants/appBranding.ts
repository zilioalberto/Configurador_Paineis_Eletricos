/** Nome exibido no cabeçalho (evitar título genérico do HTML). */
export const APP_HEADER_BRAND = 'Portal ZFW'
export const APP_HEADER_TAGLINE = 'ERP modular da ZFW Engenharia'

/** Nome completo do produto (login, sidebar, textos institucionais). */
export const APP_PRODUCT_FULL_NAME = 'Portal ZFW - ERP modular'

/** Nome amigável do utilizador (pode vir de env quando houver login). */
export function getHeaderUserDisplayName(): string {
  const v = import.meta.env.VITE_APP_USER_NAME
  if (typeof v === 'string' && v.trim() !== '') return v.trim()
  return 'Utilizador'
}
