import type { OrcamentoPreviewOfertaDto } from '../types/orcamentos'

export type SecaoPreview = OrcamentoPreviewOfertaDto['secoes'][number]

const ORDEM_SECOES_COMERCIAIS: readonly string[] = [
  'INTRODUCAO',
  'ESCOPO',
  'ITENS_FORNECIMENTO',
  'SERVICOS',
  'EXCLUSOES',
  'PRAZO_ENTREGA',
  'CONDICOES_PAGAMENTO',
  'CONDICOES_GERAIS',
  'GARANTIA',
  'OBSERVACOES',
]

const TIPOS_CONDICOES_COMERCIAIS = new Set([
  'PRAZO_ENTREGA',
  'CONDICOES_PAGAMENTO',
  'CONDICOES_GERAIS',
  'GARANTIA',
  'OBSERVACOES',
])

/** Renderizadas após a tabela de investimento na proposta ao cliente. */
const TIPOS_APOS_INVESTIMENTO = new Set(['EXCLUSOES'])

export function ordenarSecoesComerciais(secoes: SecaoPreview[]): SecaoPreview[] {
  const indice = (tipo: string) => {
    const pos = ORDEM_SECOES_COMERCIAIS.indexOf(tipo)
    return pos >= 0 ? pos : ORDEM_SECOES_COMERCIAIS.length + 1
  }
  return [...secoes].sort((a, b) => indice(a.tipo) - indice(b.tipo))
}

export function secaoIntroducao(secoes: SecaoPreview[]): SecaoPreview | null {
  return secoes.find((s) => s.tipo === 'INTRODUCAO' && (s.conteudo || '').trim()) ?? null
}

export function secoesSemIntroducao(secoes: SecaoPreview[]): SecaoPreview[] {
  return secoes.filter((s) => s.tipo !== 'INTRODUCAO' || !(s.conteudo || '').trim())
}

export function secoesCondicoesComerciais(secoes: SecaoPreview[]): SecaoPreview[] {
  return secoes.filter(
    (s) => TIPOS_CONDICOES_COMERCIAIS.has(s.tipo) && (s.conteudo || '').trim()
  )
}

/** Seções de texto antes do investimento (escopo, itens, serviços, etc.). Preserva `ordem` dos blocos. */
export function secoesCorpoProposta(secoes: SecaoPreview[]): SecaoPreview[] {
  return secoesSemIntroducao(secoes).filter(
    (s) =>
      !TIPOS_CONDICOES_COMERCIAIS.has(s.tipo) &&
      !TIPOS_APOS_INVESTIMENTO.has(s.tipo) &&
      (s.titulo || s.conteudo || '').trim()
  )
}

/** Seções exibidas logo após a tabela de investimento (ex.: exclusões). Preserva `ordem`. */
export function secoesAposInvestimento(secoes: SecaoPreview[]): SecaoPreview[] {
  return secoes.filter(
    (s) => TIPOS_APOS_INVESTIMENTO.has(s.tipo) && (s.titulo || s.conteudo || '').trim()
  )
}

export function rotuloPerfilProposta(perfil: OrcamentoPreviewOfertaDto['perfil_oferta']): string {
  return perfil === 'SOLUCAO_COMPLETA' ? 'Solução completa' : 'Materiais e valores unitários'
}

export function textoSaudacaoPadrao(perfil: OrcamentoPreviewOfertaDto['perfil_oferta']): string {
  if (perfil === 'SOLUCAO_COMPLETA') {
    return 'Apresentamos esta proposta técnica-comercial em atendimento à solicitação de V.Sas., contemplando os serviços e entregáveis descritos neste documento.'
  }
  return 'Apresentamos esta proposta técnica-comercial em atendimento à sua consulta, para o fornecimento dos itens e condições descritos abaixo.'
}

export function rotuloRevisao(revisao?: string): string {
  const valor = (revisao ?? '').trim()
  if (!valor) return 'Rev. A'
  return valor.toLowerCase().startsWith('rev') ? valor : `Rev. ${valor}`
}

/** Número da proposta para exibição (sem " Rev X" — revisão vai em campo próprio). */
/** Razão social para exibição na oferta (mesma regra do DOCX no backend). */
export function formatarNomeEmpresaExibicao(nome: string | null | undefined): string {
  const texto = (nome ?? '').trim()
  if (!texto) return '—'

  const manterMaiusculo = new Set([
    'cnc',
    'eireli',
    'epp',
    'ii',
    'iii',
    'iv',
    'ltda',
    'me',
    'mei',
    'sa',
    's/a',
    'ss',
    'zfw',
  ])
  const minusculas = new Set(['a', 'as', 'ao', 'aos', 'da', 'das', 'de', 'do', 'dos', 'e'])

  const palavras = texto.toLowerCase().split(/\s+/).map((palavra, index) => {
    const limpa = palavra.replace(/[.,;:()]/g, '')
    if (manterMaiusculo.has(limpa)) return palavra.toUpperCase()
    if (index > 0 && minusculas.has(limpa)) return palavra
    return palavra.charAt(0).toUpperCase() + palavra.slice(1)
  })
  return palavras.join(' ')
}

/** Nome sugerido ao salvar PDF (número + revisão, ex.: Prop-06001-26 Rev. C). */
export function nomeArquivoImpressaoPropostaCliente(
  codigo: string,
  revisao?: string,
  codigoBase?: string
): string {
  const numero = numeroPropostaExibicao(codigo, revisao, codigoBase)
  if (!numero || numero === '—') return 'proposta'
  const bruto = `${numero} ${rotuloRevisao(revisao)}`.trim()
  const sanitizado = bruto
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return sanitizado || 'proposta'
}

function isEspacoHorizontal(c: string): boolean {
  return c === ' ' || c === '\t'
}

/** Extrai código antes de sufixo ` Rev <token>` no final, sem regex. */
function extrairBaseAntesSufixoRev(codigo: string): string | null {
  const texto = codigo.trim()
  let fim = texto.length
  while (fim > 0 && isEspacoHorizontal(texto.charAt(fim - 1))) {
    fim -= 1
  }

  let inicioToken = fim
  while (inicioToken > 0 && !isEspacoHorizontal(texto.charAt(inicioToken - 1))) {
    inicioToken -= 1
  }
  if (inicioToken === fim) return null

  let pos = inicioToken
  while (pos > 0 && isEspacoHorizontal(texto.charAt(pos - 1))) {
    pos -= 1
  }
  if (pos < 3 || texto.slice(pos - 3, pos).toLowerCase() !== 'rev') return null
  pos -= 3

  if (pos === 0 || !isEspacoHorizontal(texto.charAt(pos - 1))) return null
  while (pos > 0 && isEspacoHorizontal(texto.charAt(pos - 1))) {
    pos -= 1
  }

  const base = texto.slice(0, pos).trim()
  return base || null
}

function removerPrefixoRev(valor: string): string {
  let resto = valor.trim()
  if (!resto.toLowerCase().startsWith('rev')) return resto

  resto = resto.slice(3)
  if (resto.startsWith('.')) resto = resto.slice(1)

  let inicio = 0
  while (inicio < resto.length && isEspacoHorizontal(resto.charAt(inicio))) {
    inicio += 1
  }
  return resto.slice(inicio).trim()
}

function removerSufixoRevComToken(codigo: string, token: string): string | null {
  const texto = codigo.trim()
  const alvo = token.trim()
  if (!alvo) return null

  let fim = texto.length
  while (fim > 0 && isEspacoHorizontal(texto.charAt(fim - 1))) {
    fim -= 1
  }
  if (fim < alvo.length) return null
  if (texto.slice(fim - alvo.length, fim).toLowerCase() !== alvo.toLowerCase()) return null

  let pos = fim - alvo.length
  while (pos > 0 && isEspacoHorizontal(texto.charAt(pos - 1))) {
    pos -= 1
  }
  if (pos < 3 || texto.slice(pos - 3, pos).toLowerCase() !== 'rev') return null
  pos -= 3

  if (pos === 0 || !isEspacoHorizontal(texto.charAt(pos - 1))) return null
  while (pos > 0 && isEspacoHorizontal(texto.charAt(pos - 1))) {
    pos -= 1
  }

  const base = texto.slice(0, pos).trim()
  return base || null
}

export function numeroPropostaExibicao(
  codigo: string,
  revisao?: string,
  codigoBase?: string
): string {
  const base = (codigoBase ?? '').trim()
  if (base) return base
  const c = (codigo || '').trim()
  if (!c) return '—'
  const semRevisao = extrairBaseAntesSufixoRev(c)
  if (semRevisao) return semRevisao
  const raw = (revisao ?? '').trim()
  if (raw) {
    const letra = removerPrefixoRev(raw)
    if (letra) {
      const baseComRevisao = removerSufixoRevComToken(c, letra)
      if (baseComRevisao) return baseComRevisao
    }
  }
  return c
}

export function formatarDataProposta(valor: string | null): string {
  if (!valor) return '—'
  const [ano, mes, dia] = valor.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return valor
  return `${dia}/${mes}/${ano}`
}

/** Formato curto estilo Figma: 04 Jun 2026 */
export function formatarDataCurta(iso: string | null): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  if (!ano || !mes || !dia) return iso
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${String(dia).padStart(2, '0')} ${meses[mes - 1]} ${ano}`
}

export function formatarDataExtensoBr(iso: string | null): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  if (!ano || !mes || !dia) return iso
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  return `${String(dia).padStart(2, '0')} de ${meses[mes - 1]} de ${ano}`
}

export function tituloSecaoFigma(titulo: string): string {
  return titulo.trim().toUpperCase()
}

/** Título + detalhe em duas linhas (referência Figma na coluna descrição). */
export function linhasDescricaoItem(descricao: string): { titulo: string; detalhe: string } {
  const texto = (descricao || '').trim()
  if (!texto) return { titulo: '—', detalhe: '' }
  const quebra = texto.indexOf('\n')
  if (quebra < 0) return { titulo: texto, detalhe: '' }
  return {
    titulo: texto.slice(0, quebra).trim() || '—',
    detalhe: texto.slice(quebra + 1).trim(),
  }
}
