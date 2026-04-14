/** Nome exibido no cabeçalho (evitar título genérico do HTML). */
export const APP_HEADER_BRAND = 'Configurador de Painéis'
export const APP_HEADER_TAGLINE = 'ZFW Engenharia'

/** Nome completo do produto (login, sidebar, textos institucionais). */
export const APP_PRODUCT_FULL_NAME = 'Configurador de Painéis Elétricos'

/** Nome amigável do utilizador (pode vir de env quando houver login). */
export function getHeaderUserDisplayName(): string {
  const v = import.meta.env.VITE_APP_USER_NAME
  if (typeof v === 'string' && v.trim() !== '') return v.trim()
  return 'Utilizador'
}
