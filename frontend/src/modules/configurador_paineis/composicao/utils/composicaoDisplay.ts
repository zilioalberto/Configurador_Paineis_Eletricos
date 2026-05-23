import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import type { CargaDetalhe, ProjetoAlimentacaoSnapshot } from '../types/composicao'

export const STATUS_APROVACAO_MARKER = '[STATUS_APROVACAO]'

/** Linhas sem carga (seccionamento / painel geral): colunas alinhadas ao projeto e ao dimensionamento. */
export const LEGENDA_TAG_PAINEL_GERAL = 'GDBT'
export const LEGENDA_DESCR_PAINEL_GERAL = 'SECCIONAMENTO'
export const LEGENDA_TIPO_PAINEL_GERAL = 'GERAL'
/** Papel/função: vazio visual (tipo e descrição cobrem a entrada geral). */
export const LEGENDA_PAPEL_PAINEL_GERAL = '—'

/** Itens de painel geral (ex.: seccionamento) sem `carga` associada no snapshot. */
export const CHAVE_AGRUPAMENTO_SEM_TAG = '__sem_tag__'

const SQRT3 = Math.sqrt(3)

export function em(v: string | null | undefined) {
  if (v == null || v === '') return '—'
  return v
}

export function montarNomeArquivoProjeto(
  codigo: string | null | undefined,
  cliente: string | null | undefined,
  nome: string | null | undefined
) {
  return [codigo, cliente, nome]
    .map((valor) => (valor ?? '').trim())
    .filter((valor) => valor !== '')
    .join(' - ')
}

export function formatPotenciaCarga(c: CargaDetalhe | null | undefined) {
  const raw = c?.potencia_corrente_valor
  if (raw == null || raw === '') return '—'
  const valorStr = String(raw)
  const u =
    (c?.potencia_corrente_unidade_display ?? c?.potencia_corrente_unidade ?? '').trim()
  const uUp = u.toUpperCase()

  const n = Number.parseFloat(valorStr.replace(',', '.'))
  if (!Number.isFinite(n)) {
    return u ? `${valorStr} ${u}` : valorStr
  }
  // Resistência (kW) e cargas em W: exibir potência indicativa em kW na composição.
  if (uUp === 'W') {
    const kw = n / 1000
    return `${kw.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })} kW`
  }
  if (uUp === 'KW') {
    return `${n.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    })} kW`
  }
  return u ? `${valorStr} ${u}` : valorStr
}

/** Descrição da carga (`cargas_carga.descricao`). */
export function textoDescricaoCarga(c: CargaDetalhe | null | undefined) {
  if (!c) return '—'
  const d = c.descricao
  if (d == null) return '—'
  const s = typeof d === 'string' ? d : String(d)
  return s.trim() === '' ? '—' : s
}

export function formatNumeroFasesCarga(c: CargaDetalhe | null | undefined) {
  if (c?.numero_fases_carga_display?.trim()) {
    return c.numero_fases_carga_display
  }
  if (c?.numero_fases_carga != null) {
    return String(c.numero_fases_carga)
  }
  return '—'
}

/** Texto de função do item (ex.: contatora K1, freio); remove linhas de status de aprovação. */
export function textoPapelItem(observacoes: string | null | undefined) {
  if (!observacoes?.trim()) return ''
  return observacoes
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(STATUS_APROVACAO_MARKER))
    .join('\n')
    .trim()
}

export function formatCorrenteCarga(c: CargaDetalhe | null | undefined) {
  if (c?.corrente_a != null && c.corrente_a !== '') {
    return `${c.corrente_a} A`
  }
  return '—'
}

function textoPreenchido(valor: string | number | null | undefined): string {
  if (valor == null) return ''
  return String(valor).trim()
}

function parseNumeroFasesPainel(
  pa: ProjetoAlimentacaoSnapshot | null | undefined,
  projeto: Projeto | undefined
): number | null {
  const raw = pa?.numero_fases ?? projeto?.numero_fases
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : null
}

function parseCorrentePainelA(
  dimensionamento: { corrente_total_painel_a?: string | null } | null | undefined,
  correnteRefItem?: string | null
): number | null {
  const correnteDimensionada = textoPreenchido(dimensionamento?.corrente_total_painel_a)
  const correnteReferencia = textoPreenchido(correnteRefItem)
  const s = correnteDimensionada || correnteReferencia
  if (!s) return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function tensaoNominalPainelV(
  pa: ProjetoAlimentacaoSnapshot | null | undefined,
  projeto: Projeto | undefined
): number | null {
  if (pa?.tensao_nominal != null) {
    const v = Number(pa.tensao_nominal)
    return Number.isFinite(v) && v > 0 ? v : null
  }
  if (projeto?.tensao_nominal != null) {
    const v = Number(projeto.tensao_nominal)
    return Number.isFinite(v) && v > 0 ? v : null
  }
  return null
}

/**
 * Potência indicativa em kW a partir de Ib, tensão nominal e fases (cos φ = 1).
 * CC: P = U·I; CA monofásico: P = U·I; CA trifásico (ou fases não informadas em CA): P = √3·U·I.
 */
export function formatPotenciaPainelEntradaKw(
  dimensionamento: { corrente_total_painel_a?: string | null } | null | undefined,
  correnteRefItem: string | null | undefined,
  pa: ProjetoAlimentacaoSnapshot | null | undefined,
  projeto: Projeto | undefined
): string {
  const i = parseCorrentePainelA(dimensionamento, correnteRefItem)
  const u = tensaoNominalPainelV(pa, projeto)
  if (i == null || u == null) return '—'

  const tipo = (pa?.tipo_corrente ?? projeto?.tipo_corrente ?? 'CA').toUpperCase()
  const nf = parseNumeroFasesPainel(pa, projeto)

  let pW: number
  if (tipo === 'CC') {
    pW = u * i
  } else if (nf === 1) {
    pW = u * i
  } else {
    pW = SQRT3 * u * i
  }

  const pKw = pW / 1000
  const rounded = Math.round(pKw * 100) / 100
  return `${rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kW`
}

export function textoTensaoAlimentacaoProjeto(
  pa: ProjetoAlimentacaoSnapshot | null | undefined,
  projeto: Projeto | undefined
): string {
  const display = pa?.tensao_nominal_display?.trim()
  if (display) return display
  if (pa?.tensao_nominal != null) return `${pa.tensao_nominal} V`
  if (projeto?.tensao_nominal != null) return `${projeto.tensao_nominal} V`
  return '—'
}

export function textoFasesAlimentacaoProjeto(
  pa: ProjetoAlimentacaoSnapshot | null | undefined,
  projeto: Projeto | undefined
): string {
  const display = pa?.numero_fases_display?.trim()
  if (display) return display
  if (pa?.numero_fases != null) return String(pa.numero_fases)
  if (projeto?.numero_fases != null) return String(projeto.numero_fases)
  return '—'
}

/** Ib painel (dimensionamento); fallback na corrente de referência do item. */
export function textoCorrenteEntradaPainel(
  dimensionamento: { corrente_total_painel_a?: string | null } | null | undefined,
  correnteRefItem?: string | null
): string {
  const ib = dimensionamento?.corrente_total_painel_a
  if (ib != null && String(ib).trim() !== '') return `${String(ib).trim()} A`
  if (correnteRefItem != null && String(correnteRefItem).trim() !== '') {
    return `${String(correnteRefItem).trim()} A`
  }
  return '—'
}

export type AgruparPorTagCargaOpts = {
  /** `ResumoDimensionamento.corrente_total_painel_a` — corrente de entrada / painel. */
  correnteTotalPainelA?: string | null
}

export type GrupoItensPorTag<T> = {
  chave: string
  tituloTag: string
  carga: CargaDetalhe | null
  itens: T[]
}

function tituloGrupoPainelGeral(opts?: AgruparPorTagCargaOpts): string {
  const correnteTotalPainelA = textoPreenchido(opts?.correnteTotalPainelA)
  if (correnteTotalPainelA) {
    return `GDBT — ${correnteTotalPainelA} A`
  }
  return 'GDBT'
}

function ordenarPorOrdemLista<T extends { ordem: number }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => a.ordem - b.ordem)
}

export function agruparPorTagCarga<T extends { carga: CargaDetalhe | null; ordem: number }>(
  itens: T[],
  opts?: AgruparPorTagCargaOpts
): GrupoItensPorTag<T>[] {
  const map = new Map<string, T[]>()
  for (const item of itens) {
    const raw = item.carga?.tag?.trim()
    const chave = raw && raw !== '' ? raw : CHAVE_AGRUPAMENTO_SEM_TAG
    const arr = map.get(chave) ?? []
    arr.push(item)
    map.set(chave, arr)
  }
  const comTag: [string, T[]][] = []
  let semTag: T[] | undefined
  for (const [chave, grupo] of map) {
    if (chave === CHAVE_AGRUPAMENTO_SEM_TAG) {
      semTag = ordenarPorOrdemLista(grupo)
    } else {
      comTag.push([chave, ordenarPorOrdemLista(grupo)])
    }
  }
  comTag.sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  const out: GrupoItensPorTag<T>[] = comTag.map(([tag, grupo]) => ({
    chave: tag,
    tituloTag: tag,
    carga: grupo[0]?.carga ?? null,
    itens: grupo,
  }))
  if (semTag?.length) {
    out.push({
      chave: CHAVE_AGRUPAMENTO_SEM_TAG,
      tituloTag: tituloGrupoPainelGeral(opts),
      carga: null,
      itens: semTag,
    })
  }
  return out
}
