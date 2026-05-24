export function formatarCapitalSocialParceiro(valor: string | null | undefined): string {
  if (!valor) return '—'
  const n = Number(valor)
  if (Number.isNaN(n)) return valor
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
