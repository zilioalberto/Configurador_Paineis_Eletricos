import type { OrcamentoDto } from '../types/orcamentos'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'

export function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Rótulo da coluna Rev. (proposta inicial não tem revisão). */
export function rotuloRevisaoOrcamento(revisao?: string | null): string {
  const rev = (revisao ?? '').trim()
  return rev || '—'
}

export function validadePadraoProposta(): string {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return d.toISOString().slice(0, 10)
}

export function proximaDescricaoPainel(orcamento: OrcamentoDto): string {
  const n = (orcamento.configuradores_painel?.length ?? 0) + 1
  const seq = String(n).padStart(2, '0')
  const codigo = (orcamento.codigo_base || orcamento.codigo || '').trim()
  const titulo = (orcamento.titulo || '').trim()
  const partes = [codigo, titulo, `Painel ${seq}`].filter(Boolean)
  return partes.join(' — ')
}

export function parseDecimalPt(valor: string): number {
  const semEspacos = valor.trim().replace(/\s/g, '')
  const normalizado = semEspacos.includes(',')
    ? semEspacos.replace(/\./g, '').replace(',', '.')
    : semEspacos
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : NaN
}

/** Impede reduzir margem abaixo do valor de referência (mínimo). */
export function clampMargemParaCima(novo: string, minimo: string): string {
  const n = parseDecimalPt(novo)
  const m = parseDecimalPt(minimo)
  if (!Number.isFinite(n)) return minimo
  if (!Number.isFinite(m)) return novo.trim()
  if (n < m) return minimo
  return novo.trim()
}

export function configuradorNovoPath(params: {
  orcamentoId: string
  vinculoId: string
  nome: string
  ordemPainel?: number
  cliente?: string | null
}): string {
  const qs = new URLSearchParams({
    orcamento: params.orcamentoId,
    vinculo: params.vinculoId,
    nome: params.nome,
  })
  if (params.ordemPainel != null) {
    qs.set('ordem', String(params.ordemPainel))
  }
  if (params.cliente?.trim()) {
    qs.set('cliente', params.cliente.trim())
  }
  return `${configuradorPaths.novaConfiguracao}?${qs.toString()}`
}

export function orcamentoDetalhePath(orcamentoId: string): string {
  return `/orcamentos/${encodeURIComponent(orcamentoId)}`
}

export function configuradorFluxoOrcamentoPath(
  path: string,
  params: {
    orcamentoId: string
    vinculoId: string
  }
): string {
  const hashIndex = path.indexOf('#')
  const pathSemHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const queryIndex = pathSemHash.indexOf('?')
  const base = queryIndex >= 0 ? pathSemHash.slice(0, queryIndex) : pathSemHash
  const qs = new URLSearchParams(queryIndex >= 0 ? pathSemHash.slice(queryIndex + 1) : '')

  qs.set('orcamento', params.orcamentoId)
  qs.set('vinculo', params.vinculoId)

  return `${base}?${qs.toString()}${hash}`
}
