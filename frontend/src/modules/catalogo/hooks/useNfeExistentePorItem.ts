import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { buscarProdutoResumoImportacaoNfe } from '../services/nfeImportService'
import type { NfeProdutoExistenteResumo, NfeSnapshot } from '../types/nfeImport'

type ItemSelecaoImportacao = {
  importar: boolean
  codigo: string
  categoria: string
}

type ExistentePorNItem = Record<number, NfeProdutoExistenteResumo | null>

function atualizarItemExistente(
  setExistentePorNItem: Dispatch<SetStateAction<ExistentePorNItem>>,
  nItem: number,
  resumo: NfeProdutoExistenteResumo | null
) {
  setExistentePorNItem((p) => ({ ...p, [nItem]: resumo }))
}

async function atualizarResumosExistentes(
  itens: NfeSnapshot['itens'],
  selecoes: Record<number, ItemSelecaoImportacao>,
  onItem: (nItem: number, resumo: NfeProdutoExistenteResumo | null) => void,
  isCancelled: () => boolean
): Promise<void> {
  for (const it of itens) {
    if (isCancelled()) return

    const sel = selecoes[it.n_item]
    const cod = (sel?.codigo ?? it.c_prod).trim()
    if (!cod) {
      onItem(it.n_item, null)
      continue
    }

    const same = cod.toUpperCase() === it.c_prod.trim().toUpperCase()
    if (same) {
      onItem(it.n_item, it.produto_existente ?? null)
      continue
    }

    const resumo = await buscarProdutoResumoImportacaoNfe(cod)
    if (!isCancelled()) {
      onItem(it.n_item, resumo)
    }
  }
}

/** Resolve produto existente por item da NF-e (debounce ao editar código/categoria). */
export function useNfeExistentePorItem(
  snapshot: NfeSnapshot | null,
  selecoes: Record<number, ItemSelecaoImportacao>
): ExistentePorNItem {
  const [existentePorNItem, setExistentePorNItem] = useState<ExistentePorNItem>({})
  const debounceRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  useEffect(() => {
    if (!snapshot?.itens?.length) {
      setExistentePorNItem({})
      return
    }
    const init: Record<number, NfeProdutoExistenteResumo | null> = {}
    for (const it of snapshot.itens) {
      init[it.n_item] = it.produto_existente ?? null
    }
    setExistentePorNItem(init)
  }, [snapshot])

  useEffect(() => {
    if (!snapshot?.itens?.length) return

    let cancelled = false
    if (debounceRef.current) globalThis.clearTimeout(debounceRef.current)

    debounceRef.current = globalThis.setTimeout(() => {
      atualizarResumosExistentes(
        snapshot.itens,
        selecoes,
        (nItem, resumo) => atualizarItemExistente(setExistentePorNItem, nItem, resumo),
        () => cancelled
      ).catch(console.error)
    }, 450)

    return () => {
      cancelled = true
      if (debounceRef.current) {
        globalThis.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [snapshot, selecoes])

  return existentePorNItem
}
