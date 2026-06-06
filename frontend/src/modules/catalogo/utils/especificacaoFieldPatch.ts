/** Patches tipados em campos numéricos da especificação (validação no form). */

import type { CategoriaProdutoNome } from '../types/categoria'

export type EspecPatch = Record<string, string | number | boolean>

function patchIntVazio(
  categoria: CategoriaProdutoNome,
  name: string,
  value: EspecPatch,
  onPatch: (p: EspecPatch) => void
): boolean {
  if (categoria === 'PLC' && name === 'entradas_analogicas') {
    onPatch({ entradas_analogicas: '', tipo_entradas_analogicas: '' })
    return true
  }
  if (categoria === 'PLC' && name === 'saidas_analogicas') {
    onPatch({ saidas_analogicas: '', tipo_saidas_analogicas: '' })
    return true
  }
  if (categoria !== 'EXPANSAO_PLC') return false

  if (name === 'entradas_analogicas') {
    const nextSai = Number(value.saidas_analogicas ?? 0) || 0
    onPatch({
      entradas_analogicas: '',
      ...(nextSai === 0 ? { tipo_sinal_analogico: '' } : {}),
    })
    return true
  }
  if (name === 'saidas_analogicas') {
    const nextEnt = Number(value.entradas_analogicas ?? 0) || 0
    onPatch({
      saidas_analogicas: '',
      ...(nextEnt === 0 ? { tipo_sinal_analogico: '' } : {}),
    })
    return true
  }
  return false
}

function patchIntNumerico(
  categoria: CategoriaProdutoNome,
  name: string,
  num: number | '',
  value: EspecPatch,
  onPatch: (p: EspecPatch) => void
): boolean {
  if (categoria === 'PLC' && name === 'entradas_analogicas' && num === 0) {
    onPatch({ entradas_analogicas: 0, tipo_entradas_analogicas: '' })
    return true
  }
  if (categoria === 'PLC' && name === 'saidas_analogicas' && num === 0) {
    onPatch({ saidas_analogicas: 0, tipo_saidas_analogicas: '' })
    return true
  }
  if (
    categoria === 'EXPANSAO_PLC' &&
    (name === 'entradas_analogicas' || name === 'saidas_analogicas') &&
    typeof num === 'number'
  ) {
    const nextEnt =
      name === 'entradas_analogicas' ? num : Number(value.entradas_analogicas ?? 0) || 0
    const nextSai =
      name === 'saidas_analogicas' ? num : Number(value.saidas_analogicas ?? 0) || 0
    onPatch({
      [name]: num,
      ...(nextEnt + nextSai === 0 ? { tipo_sinal_analogico: '' } : {}),
    })
    return true
  }
  return false
}

export function patchIntEspecField(
  categoria: CategoriaProdutoNome,
  name: string,
  raw: string,
  value: EspecPatch,
  onPatch: (p: EspecPatch) => void,
  patch: (k: string, v: string | number | boolean) => void
): void {
  if (raw === '') {
    if (!patchIntVazio(categoria, name, value, onPatch)) patch(name, '')
    return
  }

  const n = Number.parseInt(raw, 10)
  const num = Number.isFinite(n) ? n : ''

  if (!patchIntNumerico(categoria, name, num, value, onPatch)) patch(name, num)
}
