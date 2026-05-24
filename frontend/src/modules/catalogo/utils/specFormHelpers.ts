/**
 * Metadados e conversão de campos de especificação (form ↔ API).
 * `specFieldList.json` espelha os modelos Django por categoria.
 */

import type { CategoriaProdutoNome } from '../types/categoria'
import specFieldsJson from '../data/specFieldList.json'

export type SpecFieldMeta = { name: string; django: string }

export const SPEC_FIELDS_BY_CATEGORIA = specFieldsJson as Partial<
  Record<CategoriaProdutoNome, SpecFieldMeta[]>
>

const LABELS_ESPECIAIS: Record<string, string> = {
  familia: 'Família do PLC',
  familia_plc: 'Família do PLC',
  tipo_entradas_analogicas: 'Tipo das entradas analógicas',
  tipo_saidas_analogicas: 'Tipo das saídas analógicas',
  tipo_sinal_analogico: 'Tipo de sinal analógico',
  vazao_m3_h: 'Vazão (m³/h)',
  vazao_nominal_m3_h: 'Vazão nominal (m³/h)',
  secao_mm2: 'Seção (mm²)',
  potencia_w: 'Potência (W)',
  faixa_ajuste_min_a: 'Faixa ajuste mín. (A)',
  faixa_ajuste_max_a: 'Faixa ajuste máx. (A)',
}

export function labelCampoEspec(name: string): string {
  if (LABELS_ESPECIAIS[name]) return LABELS_ESPECIAIS[name]
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function sanitizarEspecificacaoApi(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.endsWith('_display')) continue
    if (k === 'id' || k === 'criado_em' || k === 'atualizado_em') continue
    out[k] = v
  }
  return out
}

/** Converte resposta da API para estado editável no formulário (strings nos decimais). */
export function apiSpecParaFormState(raw: Record<string, unknown>): Record<
  string,
  string | number | boolean
> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) {
      out[k] = ''
      continue
    }
    if (typeof v === 'boolean') {
      out[k] = v
      continue
    }
    if (typeof v === 'number') {
      out[k] = v
      continue
    }
    out[k] = String(v)
  }
  return out
}

function parseDecimalInput(v: unknown): string | null {
  const s = String(v ?? '')
    .trim()
    .replace(',', '.')
  if (s === '') return null
  return s
}

function valorCampoParaPayload(
  django: string,
  raw: string | number | boolean
): unknown | undefined {
  if (
    django !== 'BooleanField' &&
    (raw === '' || raw === undefined || raw === null)
  ) {
    return undefined
  }

  switch (django) {
    case 'BooleanField':
      return raw === true || raw === 'true' || raw === 1 || raw === '1'
    case 'DecimalField':
      return parseDecimalInput(raw)
    case 'IntegerField':
    case 'PositiveIntegerField':
    case 'PositiveSmallIntegerField': {
      if (raw === '' || raw === undefined || raw === null) return undefined
      const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
      return Number.isFinite(n) ? n : null
    }
    case 'TextField':
    case 'CharField':
      return String(raw ?? '')
    default:
      return raw
  }
}

/** Monta payload esparso: só envia chaves presentes no formulário (deixa o backend aplicar defaults). */
export function especFormParaPayload(
  estado: Record<string, string | number | boolean>,
  categoria: CategoriaProdutoNome
): Record<string, unknown> {
  const fields = SPEC_FIELDS_BY_CATEGORIA[categoria]
  const out: Record<string, unknown> = {}
  if (!fields) return out

  for (const { name, django } of fields) {
    if (!(name in estado)) continue

    const valor = valorCampoParaPayload(django, estado[name])
    if (valor !== undefined) {
      out[name] = valor
    }
  }

  return out
}
