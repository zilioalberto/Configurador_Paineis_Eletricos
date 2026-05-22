import type { CategoriaProdutoNome } from '../types/categoria'

export type EspecPatch = Record<string, string | number | boolean>

export function patchIntEspecField(
  categoria: CategoriaProdutoNome,
  name: string,
  raw: string,
  value: EspecPatch,
  onPatch: (p: EspecPatch) => void,
  patch: (k: string, v: string | number | boolean) => void
): void {
  if (raw === '') {
    if (categoria === 'PLC' && name === 'entradas_analogicas') {
      onPatch({ entradas_analogicas: '', tipo_entradas_analogicas: '' })
      return
    }
    if (categoria === 'PLC' && name === 'saidas_analogicas') {
      onPatch({ saidas_analogicas: '', tipo_saidas_analogicas: '' })
      return
    }
    if (categoria === 'EXPANSAO_PLC' && name === 'entradas_analogicas') {
      const nextSai = Number(value.saidas_analogicas ?? 0) || 0
      onPatch({
        entradas_analogicas: '',
        ...(nextSai === 0 ? { tipo_sinal_analogico: '' } : {}),
      })
      return
    }
    if (categoria === 'EXPANSAO_PLC' && name === 'saidas_analogicas') {
      const nextEnt = Number(value.entradas_analogicas ?? 0) || 0
      onPatch({
        saidas_analogicas: '',
        ...(nextEnt === 0 ? { tipo_sinal_analogico: '' } : {}),
      })
      return
    }
    patch(name, '')
    return
  }

  const n = Number.parseInt(raw, 10)
  const num = Number.isFinite(n) ? n : ''

  if (categoria === 'PLC' && name === 'entradas_analogicas' && num === 0) {
    onPatch({ entradas_analogicas: 0, tipo_entradas_analogicas: '' })
    return
  }
  if (categoria === 'PLC' && name === 'saidas_analogicas' && num === 0) {
    onPatch({ saidas_analogicas: 0, tipo_saidas_analogicas: '' })
    return
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
    return
  }

  patch(name, num)
}
