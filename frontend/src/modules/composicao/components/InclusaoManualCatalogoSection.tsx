import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useToast } from '@/components/feedback'
import { buscarProdutosAutocomplete } from '@/modules/catalogo/services/produtoService'
import type { ProdutoListItem } from '@/modules/catalogo/types/produto'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import {
  useAdicionarInclusaoManualMutation,
  useRemoverInclusaoManualMutation,
} from '../hooks/useInclusaoManualMutations'
import type { InclusaoManualItem } from '../types/composicao'

type Props = {
  projetoId: string
  podeEditar: boolean
  inclusoes: InclusaoManualItem[]
}

function em(v: string | null | undefined) {
  if (v == null || v === '') return '—'
  return v
}

const BUSCA_DEBOUNCE_MS = 320
const BUSCA_MIN_CHARS = 2

export function InclusaoManualCatalogoSection({ projetoId, podeEditar, inclusoes }: Props) {
  const { showToast } = useToast()
  const baseId = useId()
  const buscaId = `${baseId}-busca`
  const qtdId = `${baseId}-qtd`
  const obsId = `${baseId}-obs`

  const wrapRef = useRef<HTMLDivElement>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [aberto, setAberto] = useState(false)
  const [carregandoBusca, setCarregandoBusca] = useState(false)
  const [resultados, setResultados] = useState<ProdutoListItem[]>([])
  const [selecionado, setSelecionado] = useState<ProdutoListItem | null>(null)
  const [quantidade, setQuantidade] = useState('1')
  const [observacoes, setObservacoes] = useState('')

  const adicionarMutation = useAdicionarInclusaoManualMutation(projetoId)
  const removerMutation = useRemoverInclusaoManualMutation(projetoId)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(termoBusca.trim()), BUSCA_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [termoBusca])

  useEffect(() => {
    if (selecionado || debounced.length < BUSCA_MIN_CHARS) {
      return
    }
    let cancel = false
    void (async () => {
      setCarregandoBusca(true)
      try {
        const lista = await buscarProdutosAutocomplete(debounced)
        if (!cancel) setResultados(lista)
      } catch {
        if (!cancel) setResultados([])
      } finally {
        if (!cancel) setCarregandoBusca(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [debounced, selecionado])

  const itensLista =
    selecionado || debounced.length < BUSCA_MIN_CHARS ? [] : resultados

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = wrapRef.current
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return
      setAberto(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const onEscolherProduto = useCallback((p: ProdutoListItem) => {
    setSelecionado(p)
    setTermoBusca('')
    setDebounced('')
    setAberto(false)
    setResultados([])
  }, [])

  const onLimparSelecao = useCallback(() => {
    setSelecionado(null)
    setQuantidade('1')
    setObservacoes('')
  }, [])

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
            Busque por código, descrição ou fabricante (ex.: contatora AC3, minidisjuntor
            monofásico).
          </p>

          {podeEditar ? (
            <div className="row g-3 mb-4">
              <div className="col-12 col-lg-6">
                <label className="form-label fw-semibold" htmlFor={buscaId}>
                  Buscar produto
                </label>
                <div ref={wrapRef} className="position-relative">
                  <input
                    id={buscaId}
                    type="search"
                    className="form-control"
                    autoComplete="off"
                    placeholder="Digite ao menos 2 caracteres…"
                    value={selecionado ? `${selecionado.codigo} — ${selecionado.descricao}` : termoBusca}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (selecionado) return
                      setTermoBusca(e.target.value)
                      setAberto(true)
                    }}
                    onFocus={() => {
                      if (!selecionado) setAberto(true)
                    }}
                    disabled={Boolean(selecionado) || busy}
                    readOnly={Boolean(selecionado)}
                  />
                  {selecionado ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary mt-2"
                      onClick={onLimparSelecao}
                      disabled={busy}
                    >
                      Trocar produto
                    </button>
                  ) : null}
                  {aberto && !selecionado && termoBusca.trim().length >= BUSCA_MIN_CHARS ? (
                    <ul
                      className="list-group position-absolute w-100 shadow-sm mt-1"
                      style={{ zIndex: 20, maxHeight: '14rem', overflowY: 'auto' }}
                      role="listbox"
                    >
                      {carregandoBusca ? (
                        <li className="list-group-item small text-muted">Buscando…</li>
                      ) : itensLista.length === 0 ? (
                        <li className="list-group-item small text-muted">
                          Nenhum produto ativo encontrado.
                        </li>
                      ) : (
                        itensLista.map((p) => (
                          <li key={p.id} className="list-group-item list-group-item-action p-0">
                            <button
                              type="button"
                              className="btn btn-link text-start text-decoration-none w-100 py-2 px-3 rounded-0"
                              onClick={() => onEscolherProduto(p)}
                            >
                              <span className="font-monospace fw-semibold me-2">{p.codigo}</span>
                              <span className="small">{p.descricao}</span>
                              {p.categoria_display ? (
                                <span className="d-block small text-muted mt-1">
                                  {p.categoria_display}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label fw-semibold" htmlFor={qtdId}>
                  Quantidade
                </label>
                <input
                  id={qtdId}
                  type="text"
                  inputMode="decimal"
                  className="form-control"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  disabled={!selecionado || busy}
                />
              </div>
              <div className="col-12 col-lg-4">
                <label className="form-label fw-semibold" htmlFor={obsId}>
                  Observações (opcional)
                </label>
                <input
                  id={obsId}
                  type="text"
                  className="form-control"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  disabled={!selecionado || busy}
                  placeholder="Ex.: reserva, kit, posição…"
                />
              </div>
              <div className="col-12 d-flex align-items-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!selecionado || busy}
                  onClick={() => void onAdicionar()}
                >
                  {adicionarMutation.isPending ? 'Incluindo…' : 'Incluir na composição'}
                </button>
              </div>
            </div>
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
                            onClick={() => void onRemover(row.id)}
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
