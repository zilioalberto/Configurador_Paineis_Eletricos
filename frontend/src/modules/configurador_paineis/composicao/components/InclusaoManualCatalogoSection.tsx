import { useInclusaoManualCatalogoSection } from '../hooks/useInclusaoManualCatalogoSection'

import type { InclusaoManualItem } from '../types/composicao'

import { InclusaoManualCatalogoForm } from './InclusaoManualCatalogoForm'



type Props = {

  projetoId: string

  podeEditar: boolean

  inclusoes: InclusaoManualItem[]

}



function em(v: string | null | undefined) {

  if (v == null || v === '') return '—'

  return v
}

export function InclusaoManualCatalogoSection({ projetoId, podeEditar, inclusoes }: Props) {
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

  return (

    <div className="col-12">

      <div className="card border">

        <div className="card-body">

          <h2 className="h5 mb-2">Inclusões manuais (catálogo)</h2>

          <p className="small text-muted mb-3">

            Acrescente materiais do catálogo que não entram pelas sugestões automáticas.

            Busque por código, descrição ou fabricante. Opcionalmente restrinja a busca a uma

            categoria (PLCs, ventiladores, cabos, etc.).

          </p>



          {podeEditar ? (

            <InclusaoManualCatalogoForm {...form} />

          ) : (

            <p className="small text-muted mb-3">

              Projeto finalizado: inclusões manuais não podem ser alteradas.
            </p>
          )}

          {inclusoes.length === 0 ? (
            <p className="text-muted small mb-0">Nenhuma inclusão manual registrada.</p>
          ) : (
            <div className="table-responsive app-data-table">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Qtd.</th>
                    <th>Obs.</th>
                    {podeEditar ? <th className="text-end">Ações</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {inclusoes.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="badge text-bg-secondary">
                          {row.categoria_produto_display ?? row.categoria_produto}
                        </span>
                      </td>
                      <td className="font-monospace fw-semibold">
                        {row.produto?.codigo ?? '—'}
                      </td>
                      <td className="small">{em(row.produto?.descricao)}</td>
                      <td>{row.quantidade}</td>
                      <td className="small">{em(row.observacoes)}</td>
                      {podeEditar ? (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={busy}
                            onClick={() => onRemover(row.id)}
                          >
                            Remover
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>

  )

}


