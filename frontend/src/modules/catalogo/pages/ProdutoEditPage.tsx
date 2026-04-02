import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProdutoForm from '../components/ProdutoForm'
import { useCategoriaListQuery } from '../hooks/useCategoriaListQuery'
import { useProdutoDetailQuery } from '../hooks/useProdutoDetailQuery'
import { useUpdateProdutoMutation } from '../hooks/useProdutoMutations'
import type { ProdutoFormData } from '../types/produto'
import { produtoDetailToForm } from '../utils/produtoDetailToForm'
import { produtoFormToApiPayload } from '../utils/produtoPayload'

export default function ProdutoEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const loadErrorToastSent = useRef(false)

  const {
    data: produto,
    isPending: loadingProduto,
    isError: isLoadError,
    error: loadQueryError,
    refetch,
  } = useProdutoDetailQuery(id)

  const { data: categorias = [], isPending: loadingCat } = useCategoriaListQuery()
  const updateMutation = useUpdateProdutoMutation()

  const initialData = useMemo(() => {
    if (!produto || categorias.length === 0) return null
    return produtoDetailToForm(produto, categorias)
  }, [produto, categorias])

  useEffect(() => {
    loadErrorToastSent.current = false
  }, [id])

  useEffect(() => {
    if (!isLoadError || !loadQueryError || loadErrorToastSent.current) return
    loadErrorToastSent.current = true
    showToast({
      variant: 'danger',
      title: 'Erro ao carregar produto',
      message:
        loadQueryError instanceof Error
          ? loadQueryError.message
          : 'Não foi possível carregar os dados.',
    })
  }, [isLoadError, loadQueryError, showToast])

  async function handleSubmit(data: ProdutoFormData) {
    if (!id) return
    try {
      await updateMutation.mutateAsync({
        id,
        body: produtoFormToApiPayload(data, categorias),
      })
      showToast({ variant: 'success', message: 'Produto atualizado com sucesso.' })
      navigate(`/catalogo/${id}`)
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        message: extrairMensagemErroApi(err) || 'Verifique os dados e tente novamente.',
      })
    }
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="h3 mb-1">Editar produto</h1>
        <p className="text-muted mb-0">A categoria não pode ser alterada após o cadastro.</p>
      </div>

      <div className="card">
        <div className="card-body">
          {!id && (
            <div className="alert alert-danger mb-0" role="alert">
              Produto não informado.
            </div>
          )}

          {id && (loadingProduto || loadingCat) && (
            <p className="text-muted mb-0">Carregando…</p>
          )}

          {id && !loadingProduto && isLoadError && (
            <div className="d-flex flex-wrap align-items-center gap-3">
              <p className="text-danger mb-0">Não foi possível carregar este produto.</p>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => void refetch()}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {id && !loadingProduto && !isLoadError && initialData && categorias.length > 0 && (
            <ProdutoForm
              key={id}
              categorias={categorias}
              initialData={initialData}
              onSubmit={handleSubmit}
              loading={updateMutation.isPending}
              lockCategoria
            />
          )}

          <p className="small text-muted mt-3 mb-0">
            <Link to={id ? `/catalogo/${id}` : '/catalogo'}>Voltar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
