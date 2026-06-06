import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogoPaths } from '@/modules/catalogo/catalogoPaths'
import FiscalNsuStatusCard from '../components/FiscalNsuStatusCard'
import { fiscalPaths } from '../fiscalPaths'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useFiscalProdutoBuscaQuery } from '../hooks/useFiscalProdutoBuscaQuery'

/** Página inicial: busca de produtos e atalhos para NF-e e catálogo. */
export default function FiscalHomePage() {
  const { user } = useAuth()
  const [buscaInput, setBuscaInput] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')

  const podeEditar = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)

  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDebounced(buscaInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [buscaInput])

  const {
    data: resultados = [],
    isFetching,
    isError,
    error,
    isSuccess,
  } = useFiscalProdutoBuscaQuery(buscaDebounced)

  const onBuscaChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setBuscaInput(e.target.value)
  }, [])

  const mostrarEstadoVazio =
    buscaDebounced.length === 0 ||
    (isSuccess && !isFetching && resultados.length === 0 && buscaDebounced.length >= 1)

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-lg-8">
          <h1 className="h3 mb-2">Fiscal</h1>
          <p className="text-muted mb-0">
            Armazene NF-es recebidas (SEFAZ / XML manual), consulte o histórico no servidor e
            gerencie a tributação de referência dos produtos. Use a busca abaixo para ir direto ao
            produto (código, parte da descrição ou fabricante).
          </p>
        </div>
      </div>

      <FiscalNsuStatusCard />

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <label className="form-label fw-semibold mb-2" htmlFor="fiscal-busca-produto">
            Encontrar produto
          </label>
          <div className="position-relative">
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted" aria-hidden>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="currentColor"
                className="bi bi-search"
                viewBox="0 0 16 16"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
            </span>
            <input
              id="fiscal-busca-produto"
              type="search"
              className="form-control form-control-lg ps-5"
              placeholder="Ex.: código FAB-001, parte da descrição ou fabricante…"
              value={buscaInput}
              onChange={onBuscaChange}
              autoComplete="off"
              aria-describedby="fiscal-busca-produto-ajuda"
            />
          </div>
          <p id="fiscal-busca-produto-ajuda" className="form-text mb-0 mt-2">
            A pesquisa usa o mesmo critério do catálogo (palavras em código, descrição ou fabricante).
            Até 40 resultados ativos. Digite pelo menos uma letra ou número.
          </p>

          {isError && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error instanceof Error ? error.message : 'Não foi possível buscar produtos.'}
            </div>
          )}

          {buscaDebounced.length >= 1 && isFetching && (
            <p className="text-muted small mt-3 mb-0">A procurar…</p>
          )}

          {mostrarEstadoVazio && buscaDebounced.length >= 1 && !isFetching && !isError && (
            <p className="text-muted mt-3 mb-0">Nenhum produto encontrado com este texto.</p>
          )}

          {resultados.length > 0 && (
            <ul className="list-group list-group-flush border rounded mt-3 mb-0" aria-live="polite">
              {resultados.map((p) => (
                <li
                  key={p.id}
                  className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 py-3"
                >
                  <div className="min-w-0 flex-grow-1">
                    <div className="fw-semibold text-break">{p.codigo}</div>
                    <div className="small text-muted text-break">{p.descricao}</div>
                    {p.fabricante ? (
                      <div className="small text-secondary text-break">{p.fabricante}</div>
                    ) : null}
                  </div>
                  <div className="d-flex flex-wrap gap-2 flex-shrink-0">
                    <Link
                      to={catalogoPaths.produtoDetalhe(p.id)}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Ver dados fiscais
                    </Link>
                    {podeEditar ? (
                      <Link to={catalogoPaths.produtoEditar(p.id)} className="btn btn-sm btn-primary">
                        Editar produto
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {buscaDebounced.length === 0 && (
            <p className="text-muted small mt-3 mb-0">
              Comece a escrever para ver sugestões. Para ver todos os itens fiscais em tabela, use a
              lista dedicada.
            </p>
          )}
        </div>
      </div>

      <h2 className="h5 text-muted mb-3">Atalhos</h2>
      <div className="row g-3">
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h3 className="h5 card-title">NF-es recebidas</h3>
              <p className="card-text text-muted small flex-grow-1">
                Lista de notas importadas da SEFAZ (ponte A3) ou manualmente, com XML e itens no
                servidor.
              </p>
              <Link to={fiscalPaths.nfes} className="btn btn-primary">
                Ver documentos
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h3 className="h5 card-title">Importar XML (fiscal)</h3>
              <p className="card-text text-muted small flex-grow-1">
                Grava a NF-e no armazenamento fiscal sem alterar o catálogo de produtos.
              </p>
              {podeEditar ? (
                <Link to={fiscalPaths.nfeImportarManual} className="btn btn-outline-primary">
                  Enviar XML
                </Link>
              ) : (
                <span className="small text-muted">Requer permissão de edição de materiais.</span>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h3 className="h5 card-title">Importar NF-e (catálogo)</h3>
              <p className="card-text text-muted small flex-grow-1">
                Cria ou atualiza produtos a partir do XML, com pré-visualização e seleção de itens.
              </p>
              <Link to={catalogoPaths.produtoImportarNfe} className="btn btn-outline-primary">
                Ir para catálogo
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h3 className="h5 card-title">Controle NSU</h3>
              <p className="card-text text-muted small flex-grow-1">
                Estado de sincronização com a SEFAZ (consulta pela ponte A3 no futuro).
              </p>
              <Link to={fiscalPaths.nsu} className="btn btn-outline-secondary">
                Consultar NSU
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h3 className="h5 card-title">Itens fiscais</h3>
              <p className="card-text text-muted small flex-grow-1">
                Lista paginada de todos os registos fiscais; filtro opcional por produto.
              </p>
              <Link to={fiscalPaths.itensFiscais} className="btn btn-outline-primary">
                Abrir lista
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h3 className="h5 card-title">Catálogo</h3>
              <p className="card-text text-muted small flex-grow-1">
                Listagem completa de produtos por categoria.
              </p>
              <Link to={catalogoPaths.produtos} className="btn btn-outline-secondary">
                Abrir catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
