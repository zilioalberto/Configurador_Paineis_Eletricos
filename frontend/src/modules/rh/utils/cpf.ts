/** Extrai até 11 dígitos do CPF. */
export function apenasDigitosCpf(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

/** Formata entrada como 000.000.000-00 enquanto o usuário digita. */
export function aplicarMascaraCpf(value: string): string {
  const d = apenasDigitosCpf(value)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function calcularDigitoCpf(base: string, pesos: readonly number[]): number {
  const soma = base.split('').reduce((acc, digito, index) => acc + Number(digito) * pesos[index], 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

/** Retorna mensagem de erro ou null se o CPF estiver vazio ou válido. */
export function validarCpf(value: string): string | null {
  const digits = apenasDigitosCpf(value)
  if (!digits) return null
  if (digits.length !== 11) return 'CPF deve conter 11 dígitos.'
  if (/^(\d)\1{10}$/.test(digits)) return 'CPF inválido.'

  const primeiro = calcularDigitoCpf(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const segundo = calcularDigitoCpf(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  const esperado = `${primeiro}${segundo}`

  if (!digits.endsWith(esperado)) return 'CPF inválido (dígitos verificadores).'
  return null
}
