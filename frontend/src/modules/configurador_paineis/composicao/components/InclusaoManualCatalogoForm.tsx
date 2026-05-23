import type { ChangeEvent } from 'react'
import type { ProdutoListItem } from '@/modules/catalogo/types/produto'
import type { useInclusaoManualCatalogoSection } from '../hooks/useInclusaoManualCatalogoSection'

type FormState = ReturnType<typeof useInclusaoManualCatalogoSection>

type Props = Readonly<
  Pick<
    FormState,
    | 'baseId'
    | 'buscaId'
    | 'qtdId'
    | 'obsId'
    | 'wrapRef'
    | 'listRef'
    | 'filtroCategoria'
    | 'setFiltroCategoria'
    | 'categoriasCatalogo'
    | 'loadingCategoriasCatalogo'
    | 'quantidade'
    | 'setQuantidade'
    | 'observacoes'
    | 'setObservacoes'
    | 'BUSCA_MIN_CHARS'
    | 'termoBusca'
    | 'setTermoBusca'
    | 'aberto'
    | 'setAberto'
    | 'carregandoBusca'
    | 'selecionado'
    | 'itensLista'
    | 'highlightIndex'
    | 'handleListboxKeyDown'
    | 'onEscolherProduto'
    | 'onLimparSelecao'
    | 'onAdicionar'
    | 'busy'
    | 'adicionarPending'
  >
>

function InclusaoManualProdutoListbox({
  buscaId,
  carregandoBusca,
  itensLista,
  highlightIndex,
  onEscolherProduto,
}: Readonly<{
  buscaId: string
  carregandoBusca: boolean
  itensLista: ProdutoListItem[]
  highlightIndex: number
  onEscolherProduto: (produto: ProdutoListItem) => void
}>) {
  if (carregandoBusca) {
    return <li className="list-group-item small text-muted">Buscando…</li>
  }
  if (itensLista.length === 0) {
    return (
      <li className="list-group-item small text-muted">Nenhum produto ativo encontrado.</li>
    )
  }
  return (
    <>
      {itensLista.map((p, index) => (
        <li key={p.id} className="list-group-item list-group-item-action p-0">
          <button
            id={`${buscaId}-opt-${index}`}
            type="button"
            role="option"
            aria-selected={index === highlightIndex}
            className={`btn btn-link text-start text-decoration-none w-100 py-2 px-3 rounded-0 ${
              index === highlightIndex ? 'bg-light' : ''
            }`}
            onClick={() => onEscolherProduto(p)}
          >
            <span className="font-monospace fw-semibold me-2">{p.codigo}</span>
            <span className="small">{p.descricao}</span>
            {p.categoria_display ? (
              <span className="d-block small text-muted mt-1">{p.categoria_display}</span>
            ) : null}
          </button>
        </li>
      ))}
    </>
  )
}

export function InclusaoManualCatalogoForm({
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
  busy,
  adicionarPending,
}: Props) {
  const listaAberta =
    aberto && !selecionado && termoBusca.trim().length >= BUSCA_MIN_CHARS

  return (
    <div className="row g-3 mb-4">
      <div className="col-12 col-md-6 col-xl-4">
        <label className="form-label fw-semibold" htmlFor={`${baseId}-filtro-cat`}>
          Categoria (opcional)
        </label>
        <select
          id={`${baseId}-filtro-cat`}
          className="form-select"
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          disabled={busy || loadingCategoriasCatalogo}
        >
          <option value="">Todas</option>
          {categoriasCatalogo.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_display ?? c.nome}
            </option>
          ))}
        </select>
      </div>
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
            role="combobox"
            aria-expanded={Boolean(listaAberta)}
            aria-autocomplete="list"
            aria-controls={`${buscaId}-listbox`}
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
            onKeyDown={(e) => {
              if (selecionado || busy) return
              handleListboxKeyDown(e, onEscolherProduto, {
                onEscape: () => setAberto(false),
              })
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
          {listaAberta ? (
            <ul
              ref={listRef}
              id={`${buscaId}-listbox`}
              className="list-group position-absolute w-100 shadow-sm mt-1"
              style={{ zIndex: 20, maxHeight: '14rem', overflowY: 'auto' }}
              role="listbox"
            >
              <InclusaoManualProdutoListbox
                buscaId={buscaId}
                carregandoBusca={carregandoBusca}
                itensLista={itensLista}
                highlightIndex={highlightIndex}
                onEscolherProduto={onEscolherProduto}
              />
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
          onClick={onAdicionar}
        >
          {adicionarPending ? 'Incluindo…' : 'Incluir na composição'}
        </button>
      </div>
    </div>
  )
}
