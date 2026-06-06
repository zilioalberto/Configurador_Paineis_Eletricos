import { useCallback, useEffect, useRef, useState } from 'react'

import { buscarServicosAutocomplete } from '@/modules/catalogo/services/servicoService'
import type { ServicoListItem } from '@/modules/catalogo/types/servico'

const DEBOUNCE_MS = 300
export const ORCAMENTO_SERVICO_MIN_CHARS = 2

export function useOrcamentoServicoBusca(termo: string) {
  const [itens, setItens] = useState<ServicoListItem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback(async (t: string) => {
    const q = t.trim()
    if (q.length < ORCAMENTO_SERVICO_MIN_CHARS) {
      setItens([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    try {
      const lista = await buscarServicosAutocomplete(q)
      setItens(lista)
    } catch {
      setItens([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void buscar(termo)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [termo, buscar])

  function limparResultados() {
    setItens([])
    setAberto(false)
  }

  return {
    itens,
    carregando,
    aberto,
    setAberto,
    limparResultados,
    minChars: ORCAMENTO_SERVICO_MIN_CHARS,
  }
}
