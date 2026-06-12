export function periodoDaCompetencia(competencia: string): { data_inicio: string; data_fim: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(competencia.trim())
  if (!match) return null
  const ano = Number(match[1])
  const mes = Number(match[2])
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) return null
  const ultimoDia = new Date(ano, mes, 0).getDate()
  return {
    data_inicio: `${match[1]}-${match[2]}-01`,
    data_fim: `${match[1]}-${match[2]}-${String(ultimoDia).padStart(2, '0')}`,
  }
}

export function competenciaAtualLocal(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}
