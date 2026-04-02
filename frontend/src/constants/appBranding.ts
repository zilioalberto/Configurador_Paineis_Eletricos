/** Nome exibido no cabeçalho (evitar título genérico do HTML). */
export const APP_HEADER_BRAND = 'Configurador de Painéis'
export const APP_HEADER_TAGLINE = 'ZFW Engenharia'

/** Nome amigável do utilizador (pode vir de env quando houver login). */
export function getHeaderUserDisplayName(): string {
  const v = import.meta.env.VITE_APP_USER_NAME
  if (typeof v === 'string' && v.trim() !== '') return v.trim()
  return 'Utilizador'
}
