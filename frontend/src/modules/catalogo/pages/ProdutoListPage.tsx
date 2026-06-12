import { type ChangeEvent, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProdutoTable from '../components/ProdutoTable'
import { catalogoPaths } from '../catalogoPaths'
import { useCategoriaListQuery } from '../hooks/useCategoriaListQuery'
import { useDeleteProdutoMutation } from '../hooks/useProdutoMutations'
import { useProdutoListQuery } from '../hooks/useProdutoListQuery'

type DeleteTarget = { id: string; label: string }

/** Lista de produtos do catálogo com filtros e paginação. */
export default function ProdutoListPage() {
  const { user } = useAuth()
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [buscaRapida, setBuscaRapida] = useState<string>('')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const pageSize = 50
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const canManageProdutos = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)

  const { data: categorias = [], isPending: loadingCat } = useCategoriaListQuery()
  const categoriaQuery = filtroCategoria || null
  const searchQuery = buscaRapida.trim() || null
  const {
    data: pageData,
    isPending: loadingProdutos,
    isError,
    error: loadError,
    refetch,
  } = useProdutoListQuery(categoriaQuery, paginaAtual, pageSize, searchQuery)
  const produtos = useMemo(() => pageData?.items ?? [], [pageData?.items])

  const deleteMutation = useDeleteProdutoMutation()

  const onFiltroChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setFiltroCategoria(e.target.value)
    setPaginaAtual(1)
  }, [])

  const onBuscaRapidaChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setBuscaRapida(e.target.value)
    setPaginaAtual(1)
  }, [])

  const onDeleteRequest = useCallback(
    (id: string) => {
      const p = produtos.find((x) => x.id === id)
      setDeleteTarget({
        id,
        label: p?.descricao?.trim() || p?.codigo?.trim() || 'este produto',
      })
    },
    [produtos]
  )

  const closeModal = useCallback(() => {
    if (!deleteMutation.isPending) setDeleteTarget(null)
  }, [deleteMutation.isPending])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      showToast({ variant: 'success', message: 'Produto excluído com sucesso.' })
    } catch (err) {
      console.error(err)
      setDeleteTarget(null)
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [deleteTarget, deleteMutation, showToast])

  const tituloFiltro = useMemo(() => {
    if (!filtroCategoria) return 'Todas as categorias'
    const c = categorias.find((x) => x.id === filtroCategoria)
    return c?.nome_display ?? c?.nome ?? filtroCategoria
  }, [categorias, filtroCategoria])

  return (
    <div className="container-fluid">
      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir produto"
        message={
          deleteTarget
            ? `Deseja realmente excluir "${deleteTarget.label}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onCancel={closeModal}
        onConfirm={() => void confirmDelete()}
      />

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Catálogo</h1>
          <p className="text-muted mb-0">
            Produtos por categoria; cada item pode ter especificação técnica alinhada ao modelo
            correspondente no servidor (painéis, cabos, PLCs, ventiladores, etc.).
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void refetch()}
          >
            Atualizar
          </button>
          {canManageProdutos ? (
            <>
              <Link to={catalogoPaths.produtoImportarNfe} className="btn btn-outline-primary">
                Importar NF-e
              </Link>
              <Link to={catalogoPaths.produtoNovo} className="btn btn-primary">
                Novo produto
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6 col-lg-5">
              <label className="form-label fw-semibold" htmlFor="filtro-cat-catalogo">
                Filtrar por categoria
              </label>
              <select
                id="filtro-cat-catalogo"
                className="form-select"
                value={filtroCategoria}
                onChange={onFiltroChange}
                disabled={loadingCat}
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_display ?? c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 col-lg-5">
              <label className="form-label fw-semibold" htmlFor="busca-rapida-produto">
                Busca rápida por código
              </label>
              <input
                id="busca-rapida-produto"
                type="search"
                className="form-control"
                value={buscaRapida}
                onChange={onBuscaRapidaChange}
                placeholder="Digite parte do código"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="small text-muted mb-3">
            Listagem: <strong>{tituloFiltro}</strong>
          </p>
          {loadingProdutos && <p className="text-muted mb-0">Carregando…</p>}
          {!loadingProdutos && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {loadError instanceof Error
                ? loadError.message
                : 'Não foi possível carregar os produtos.'}
            </div>
          )}
          {!loadingProdutos && !isError && (
            <>
              <ProdutoTable
                produtos={produtos}
                onDeleteRequest={onDeleteRequest}
                canManage={canManageProdutos}
              />
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                <p className="small text-muted mb-0">
                  {`Mostrando ${produtos.length} de ${pageData?.total ?? produtos.length} itens`}
                </p>
                <div className="btn-group" role="group" aria-label="Paginação de produtos">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={loadingProdutos || !pageData?.hasPrevious}
                  >
                    Anterior
                  </button>
                  <button type="button" className="btn btn-outline-secondary" disabled>
                    Página {paginaAtual}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setPaginaAtual((p) => p + 1)}
                    disabled={loadingProdutos || !pageData?.hasNext}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
