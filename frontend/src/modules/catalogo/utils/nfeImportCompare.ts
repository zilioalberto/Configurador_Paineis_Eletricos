/**
 * Comparação XML × catálogo para importação NF-e.
 * Manter alinhado com `apps.catalogo.services.nfe_catalogo_preview_enrich.produto_diverge_do_xml`.
 */
import { unidadeMedidaProdutoOptions } from '@/modules/catalogo/constants/catalogoChoiceOptions'
import type { NfeItemPreview, NfeProdutoExistenteResumo } from '../types/nfeImport'

const UNIDADES_VALIDAS = new Set<string>(unidadeMedidaProdutoOptions.map((o) => o.value))

const ORIGENS_ICMS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8'])

function normStr(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toUpperCase()
}

function normDigits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

function precoXml(it: NfeItemPreview): string {
  const n = Number(String(it.v_un_com ?? '0').replace(',', '.'))
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

function origemXml(it: NfeItemPreview): string {
  const o = String(it.imposto?.orig ?? '')
    .trim()
    .slice(0, 1)
  return ORIGENS_ICMS.has(o) ? o : '0'
}

function unidadeXml(it: NfeItemPreview): string {
  const u = String(it.unidade_catalogo ?? 'UN').trim()
  return UNIDADES_VALIDAS.has(u) ? u : 'UN'
}

function utribXml(it: NfeItemPreview): string {
  const u = String(it.u_trib_catalogo ?? '').trim()
  if (!u) return ''
  return UNIDADES_VALIDAS.has(u) ? u : ''
}

function decIpi(s: string | undefined): string | null {
  const t = String(s ?? '')
    .trim()
    .replace(',', '.')
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n.toFixed(4)
}

function decIpiFromXml(it: NfeItemPreview): string | null {
  return decIpi(it.imposto?.p_ipi)
}

function decIpiFromResumo(ex: NfeProdutoExistenteResumo): string | null {
  return decIpi(ex.aliquota_ipi)
}

export function nfeItemLinhaDivergeDoCatalogo(
  it: NfeItemPreview,
  categoriaEscolhida: string,
  ex: NfeProdutoExistenteResumo | null | undefined,
): boolean {
  if (!ex) return false
  const codRef = normStr(ex.codigo)
  const descXml = normStr(it.x_prod || codRef)
  if (normStr(ex.descricao) !== descXml) return true
  if ((ex.categoria || '').trim() !== (categoriaEscolhida || '').trim()) return true
  if ((ex.unidade_medida || '').trim() !== unidadeXml(it)) return true
  if ((ex.unidade_tributavel || '').trim() !== utribXml(it)) return true
  if ((ex.custo_referencia || '').trim() !== precoXml(it)) return true
  if (normDigits(ex.ncm) !== normDigits(it.ncm)) return true
  if (normDigits(ex.cest) !== normDigits(it.cest)) return true
  if (normStr(ex.gtin) !== normStr(it.c_ean)) return true
  if ((ex.origem_mercadoria || '').trim() !== origemXml(it)) return true
  const aDb = decIpiFromResumo(ex)
  const aXml = decIpiFromXml(it)
  if (aDb !== aXml) return true
  return false
}

export type NfeCampoComparacao = {
  id: string
  label: string
  xml: string
  catalogo: string
  diverge: boolean
}

export function buildNfeCamposComparacao(
  it: NfeItemPreview,
  categoriaEscolhida: string,
  categoriaLabel: string,
  ex: NfeProdutoExistenteResumo,
): NfeCampoComparacao[] {
  const rows: NfeCampoComparacao[] = [
    {
      id: 'descricao',
      label: 'Descrição',
      xml: String(it.x_prod ?? ''),
      catalogo: ex.descricao,
      diverge: normStr(ex.descricao) !== normStr(it.x_prod || ex.codigo),
    },
    {
      id: 'categoria',
      label: 'Categoria (escolhida na importação)',
      xml: categoriaLabel || categoriaEscolhida || '—',
      catalogo: ex.categoria,
      diverge: (categoriaEscolhida || '').trim() !== (ex.categoria || '').trim(),
    },
    {
      id: 'unidade_medida',
      label: 'Unidade (uCom)',
      xml: unidadeXml(it),
      catalogo: ex.unidade_medida,
      diverge: (ex.unidade_medida || '').trim() !== unidadeXml(it),
    },
    {
      id: 'unidade_tributavel',
      label: 'Unidade tributável (uTrib)',
      xml: utribXml(it) || '—',
      catalogo: ex.unidade_tributavel || '—',
      diverge: (ex.unidade_tributavel || '').trim() !== utribXml(it),
    },
    {
      id: 'custo_referencia',
      label: 'Preço unitário (vUnCom → custo de referência)',
      xml: precoXml(it),
      catalogo: ex.custo_referencia,
      diverge: (ex.custo_referencia || '').trim() !== precoXml(it),
    },
    {
      id: 'ncm',
      label: 'NCM',
      xml: normDigits(it.ncm) || '—',
      catalogo: normDigits(ex.ncm) || '—',
      diverge: normDigits(ex.ncm) !== normDigits(it.ncm),
    },
    {
      id: 'cest',
      label: 'CEST',
      xml: normDigits(it.cest) || '—',
      catalogo: normDigits(ex.cest) || '—',
      diverge: normDigits(ex.cest) !== normDigits(it.cest),
    },
    {
      id: 'gtin',
      label: 'GTIN / cEAN',
      xml: normStr(it.c_ean) || '—',
      catalogo: normStr(ex.gtin) || '—',
      diverge: normStr(ex.gtin) !== normStr(it.c_ean),
    },
    {
      id: 'origem',
      label: 'Origem ICMS (orig)',
      xml: origemXml(it),
      catalogo: (ex.origem_mercadoria || '').trim() || '—',
      diverge: (ex.origem_mercadoria || '').trim() !== origemXml(it),
    },
    {
      id: 'ipi',
      label: 'Alíquota IPI (%)',
      xml: decIpiFromXml(it) ?? '—',
      catalogo: decIpiFromResumo(ex) ?? '—',
      diverge: decIpiFromResumo(ex) !== decIpiFromXml(it),
    },
  ]
  return rows
}
