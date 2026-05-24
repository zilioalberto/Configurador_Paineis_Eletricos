import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useItensFiscaisListQuery } from '../hooks/useItensFiscaisListQuery'

/** Tabela paginada de todos os itens fiscais registrados. */
export default function ItensFiscaisListPage() {
  const [inputSearch, setInputSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const pageSize = 50

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedSearch(inputSearch.trim()), 400)
    return () => globalThis.clearTimeout(t)
  }, [inputSearch])

  useEffect(() => {
    setPaginaAtual(1)
  }, [debouncedSearch])

  const {
    data: pageData,
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useItensFiscaisListQuery(debouncedSearch, paginaAtual, pageSize)

  const items = pageData?.items ?? []

  const onSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputSearch(e.target.value)
  }, [])

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link to="/fiscal">Fiscal</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Itens fiscais
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-1">Itens fiscais</h1>
          <p className="text-muted mb-0">
            Registros de tributação de referência ligados a produtos do catálogo (ex.: linhas de NF-e
            importadas).
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={() => void refetch()}>
          Atualizar
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <label className="form-label fw-semibold" htmlFor="fiscal-busca-itens">
            Pesquisar por produto
          </label>
          <input
            id="fiscal-busca-itens"
            type="search"
            className="form-control"
            style={{ maxWidth: '32rem' }}
            placeholder="Código ou descrição do produto…"
            value={inputSearch}
            onChange={onSearchChange}
            autoComplete="off"
          />
          <p className="small text-muted mt-2 mb-0">
            Deixe em branco para listar todos. Com texto, filtra por código ou descrição do produto
            (após um breve atraso).
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {isPending && <p className="text-muted p-3 mb-0">Carregando…</p>}
          {isError && (
            <div className="alert alert-danger m-3 mb-0" role="alert">
              {loadError instanceof Error
                ? loadError.message
                : 'Não foi possível carregar os itens fiscais.'}
            </div>
          )}
          {!isPending && !isError && items.length === 0 && (
            <p className="text-muted p-3 mb-0">Nenhum item encontrado.</p>
          )}
          {!isPending && !isError && items.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Produto</th>
                    <th scope="col">Rótulo</th>
                    <th scope="col">CFOP</th>
                    <th scope="col">Orig.</th>
                    <th scope="col">CST ICMS</th>
                    <th scope="col" className="text-end">
                      % IPI
                    </th>
                    <th scope="col" className="text-end">
                      Item NF-e
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/catalogo/${row.produto_id}`} className="fw-semibold text-break">
                          {row.produto_codigo}
                        </Link>
                        <div className="small text-muted text-break">{row.produto_descricao}</div>
                      </td>
                      <td className="text-break">{row.rotulo || '—'}</td>
                      <td>{row.cfop || '—'}</td>
                      <td>{row.origem_mercadoria ?? '—'}</td>
                      <td>{row.cst_icms || '—'}</td>
                      <td className="text-end">{row.p_ipi != null && row.p_ipi !== '' ? row.p_ipi : '—'}</td>
                      <td className="text-end">{row.n_item_nfe ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isPending && !isError && items.length > 0 && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top">
              <p className="small text-muted mb-0">
                {`Mostrando ${items.length} de ${pageData?.total ?? items.length} itens`}
              </p>
              <nav className="btn-group" aria-label="Paginação">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={isPending || !pageData?.hasPrevious}
                >
                  Anterior
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                  Página {paginaAtual}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPaginaAtual((p) => p + 1)}
                  disabled={isPending || !pageData?.hasNext}
                >
                  Próxima
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
