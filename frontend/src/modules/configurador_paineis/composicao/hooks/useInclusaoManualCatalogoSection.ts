import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useToast } from '@/components/feedback'
import { useListboxKeyboardNavigation } from '@/hooks/useListboxKeyboardNavigation'
import { useCategoriaListQuery } from '@/modules/catalogo/hooks/useCategoriaListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useInclusaoManualProdutoBusca } from './useInclusaoManualProdutoBusca'
import {
  useAdicionarInclusaoManualMutation,
  useRemoverInclusaoManualMutation,
} from './useInclusaoManualMutations'

export function useInclusaoManualCatalogoSection(projetoId: string, podeEditar: boolean) {
  const { showToast } = useToast()
  const baseId = useId()
  const buscaId = `${baseId}-busca`
  const qtdId = `${baseId}-qtd`
  const obsId = `${baseId}-obs`

  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const { data: categoriasCatalogo = [], isPending: loadingCategoriasCatalogo } =
    useCategoriaListQuery()
  const [quantidade, setQuantidade] = useState('1')
  const [observacoes, setObservacoes] = useState('')

  const busca = useInclusaoManualProdutoBusca(filtroCategoria)
  const {
    BUSCA_MIN_CHARS,
    termoBusca,
    setTermoBusca,
    aberto,
    setAberto,
    carregandoBusca,
    selecionado,
    itensLista,
    navigableItems,
    listaTecladoAtiva,
    keyboardResetKey,
    onEscolherProduto,
    onLimparSelecao,
  } = busca

  const adicionarMutation = useAdicionarInclusaoManualMutation(projetoId)
  const removerMutation = useRemoverInclusaoManualMutation(projetoId)

  const { activeIndex: highlightIndex, handleKeyDown: handleListboxKeyDown } =
    useListboxKeyboardNavigation(navigableItems, {
      isActive: listaTecladoAtiva,
      resetKey: keyboardResetKey,
    })

  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`#${buscaId}-opt-${highlightIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex, buscaId])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = wrapRef.current
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return
      setAberto(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [setAberto])

  const onAdicionar = useCallback(async () => {
    if (!selecionado || !podeEditar) return
    const q = quantidade.trim() || '1'
    try {
      await adicionarMutation.mutateAsync({
        produto_id: selecionado.id,
        quantidade: q,
        observacoes: observacoes.trim() || undefined,
      })
      showToast({ variant: 'success', message: 'Produto incluído na composição.' })
      onLimparSelecao()
      setQuantidade('1')
      setObservacoes('')
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível incluir o produto',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [
    selecionado,
    podeEditar,
    quantidade,
    observacoes,
    adicionarMutation,
    showToast,
    onLimparSelecao,
  ])

  const onRemover = useCallback(
    async (id: string) => {
      if (!podeEditar) return
      try {
        await removerMutation.mutateAsync(id)
        showToast({ variant: 'success', message: 'Inclusão removida.' })
      } catch (err) {
        console.error(err)
        showToast({
          variant: 'danger',
          title: 'Não foi possível remover',
          message: extrairMensagemErroApi(err) || 'Tente novamente.',
        })
      }
    },
    [podeEditar, removerMutation, showToast]
  )

  const busy = adicionarMutation.isPending || removerMutation.isPending

  return {
    baseId,
    buscaId,
    qtdId,
    obsId,
    wrapRef,
    listRef,
    filtroCategoria,
    setFiltroCategoria,
    categoriasCatalogo,
    loadingCategoriasCatalogo,
    quantidade,
    setQuantidade,
    observacoes,
    setObservacoes,
    BUSCA_MIN_CHARS,
    termoBusca,
    setTermoBusca,
    aberto,
    setAberto,
    carregandoBusca,
    selecionado,
    itensLista,
    highlightIndex,
    handleListboxKeyDown,
    onEscolherProduto,
    onLimparSelecao,
    onAdicionar,
    onRemover,
    busy,
    adicionarPending: adicionarMutation.isPending,
  }
}
