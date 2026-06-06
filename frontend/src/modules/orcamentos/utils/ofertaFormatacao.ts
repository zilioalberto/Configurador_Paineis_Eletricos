/** Formatação de texto da oferta (espelha formatacao_oferta.py no backend). */

const SIGLAS = new Set([
  'ca',
  'cc',
  'clp',
  'cnc',
  'ihm',
  'io',
  'i/o',
  'plc',
  'siemens',
  'zfw',
  'vcc',
  'vca',
  'na',
  'nf',
  'ma',
])

function predominantementeMaiusculo(texto: string): boolean {
  const letras = [...texto].filter((c) => /[a-zA-ZÀ-ÿ]/.test(c))
  if (letras.length < 3) return false
  const maiusculas = letras.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length
  return maiusculas / letras.length >= 0.75
}

function iniciarFrase(texto: string): string {
  const chars = [...texto]
  for (let index = 0; index < chars.length; index += 1) {
    if (/[a-zA-ZÀ-ÿ]/.test(chars[index])) {
      chars[index] = chars[index].toUpperCase()
      break
    }
  }
  return chars.join('')
}

function aplicarTokensTecnicos(texto: string): string {
  let resultado = texto
  resultado = resultado.replace(/ac(\d+):([a-z0-9]+)/gi, (_, ac, sufixo) => `AC${ac}:${sufixo.toUpperCase()}`)
  resultado = resultado.replace(/\bac(\d+)\b/gi, (_, num) => `AC${num}`)
  resultado = resultado.replace(
    /\b(\d+)(vcc|vca|na|nf|ma)\b/gi,
    (_, num, sigla) => `${num}${sigla.toUpperCase()}`
  )
  for (const sigla of [...SIGLAS].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${sigla.replace('/', '\\/')}\\b`, 'gi')
    resultado = resultado.replace(re, sigla.toUpperCase())
  }
  return resultado
}

export function capitalizarTextoTecnico(valor: string): string {
  const texto = valor ?? ''
  if (!texto.trim()) return texto

  return texto
    .split('\n')
    .map((linha) => {
      const conteudo = linha.trim()
      if (!conteudo || !predominantementeMaiusculo(conteudo)) return linha
      return aplicarTokensTecnicos(iniciarFrase(conteudo.toLowerCase()))
    })
    .join('\n')
}

export function formatarDescricaoItemOferta(valor: string): string {
  const texto = (valor ?? '').trim()
  if (!texto) return ''
  if (!predominantementeMaiusculo(texto)) return texto
  return capitalizarTextoTecnico(texto)
}

export function formatarConteudoListaOferta(conteudo: string): string {
  if (!(conteudo ?? '').trim()) return conteudo ?? ''

  return conteudo
    .split('\n')
    .map((linha) => {
      const limpa = linha.trim()
      if (!limpa) return linha
      if (limpa.startsWith('- ')) {
        const corpo = limpa.slice(2).replace(/;+\s*$/, '').trim()
        const formatado = formatarDescricaoItemOferta(corpo)
        return formatado ? `- ${formatado};` : '- ;'
      }
      return predominantementeMaiusculo(linha) ? capitalizarTextoTecnico(linha) : linha
    })
    .join('\n')
}

export function normalizarBlocosListaOferta<T extends { tipo: string; conteudo: string }>(
  blocos: T[]
): T[] {
  return blocos.map((b) =>
    b.tipo === 'ITENS_FORNECIMENTO' || b.tipo === 'SERVICOS'
      ? { ...b, conteudo: formatarConteudoListaOferta(b.conteudo || '') }
      : b
  )
}
