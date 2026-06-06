import { useEffect, useMemo, useState } from 'react'
import { buscarProdutosAutocomplete } from '@/modules/catalogo/services/produtoService'
import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

const BUSCA_DEBOUNCE_MS = 320
const BUSCA_MIN_CHARS = 2
const EMPTY_PRODUTOS: ProdutoListItem[] = []

/** Autocomplete de produtos do catálogo para inclusão manual (debounce + filtro por categoria). */
export function useInclusaoManualProdutoBusca(filtroCategoria: string) {
  const [termoBusca, setTermoBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [aberto, setAberto] = useState(false)
  const [carregandoBusca, setCarregandoBusca] = useState(false)
  const [resultados, setResultados] = useState<ProdutoListItem[]>([])
  const [selecionado, setSelecionado] = useState<ProdutoListItem | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termoBusca.trim()), BUSCA_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [termoBusca])

  useEffect(() => {
    if (selecionado || debounced.length < BUSCA_MIN_CHARS) return

    let cancel = false
    const run = async () => {
      setCarregandoBusca(true)
      try {
        const lista = await buscarProdutosAutocomplete(debounced, filtroCategoria || null)
        if (!cancel) setResultados(lista)
      } catch {
        if (!cancel) setResultados([])
      } finally {
        if (!cancel) setCarregandoBusca(false)
      }
    }
    run().catch(() => undefined)

    return () => {
      cancel = true
    }
  }, [debounced, selecionado, filtroCategoria])

  const itensLista = useMemo(() => {
    if (selecionado || debounced.length < BUSCA_MIN_CHARS) return EMPTY_PRODUTOS
    return resultados
  }, [selecionado, debounced, resultados])

  const navigableItems = carregandoBusca ? EMPTY_PRODUTOS : itensLista
  const listaTecladoAtiva =
    Boolean(aberto && !selecionado && debounced.length >= BUSCA_MIN_CHARS) &&
    navigableItems.length > 0

  const onEscolherProduto = (p: ProdutoListItem) => {
    setSelecionado(p)
    setTermoBusca('')
    setDebounced('')
    setAberto(false)
    setResultados([])
  }

  const onLimparSelecao = () => {
    setSelecionado(null)
    setTermoBusca('')
    setDebounced('')
    setAberto(false)
    setResultados([])
  }

  return {
    BUSCA_MIN_CHARS,
    termoBusca,
    setTermoBusca,
    debounced,
    aberto,
    setAberto,
    carregandoBusca,
    selecionado,
    itensLista,
    navigableItems,
    listaTecladoAtiva,
    keyboardResetKey: `${debounced}|${filtroCategoria}|${resultados.map((p) => p.id).join(',')}`,
    onEscolherProduto,
    onLimparSelecao,
  }
}
