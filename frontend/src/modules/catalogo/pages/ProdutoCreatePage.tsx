import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProdutoForm from '../components/ProdutoForm'
import { useCategoriaListQuery } from '../hooks/useCategoriaListQuery'
import { useCreateProdutoMutation } from '../hooks/useProdutoMutations'
import type { ProdutoFormData } from '../types/produto'
import { produtoFormEmpty } from '../utils/produtoFormDefaults'
import { produtoFormToApiPayload } from '../utils/produtoPayload'

export default function ProdutoCreatePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: categorias = [], isPending: loadingCat } = useCategoriaListQuery()
  const createMutation = useCreateProdutoMutation()

  const initialData = useMemo(() => produtoFormEmpty(), [])

  async function handleSubmit(data: ProdutoFormData) {
    try {
      const created = await createMutation.mutateAsync(
        produtoFormToApiPayload(data, categorias)
      )
      showToast({ variant: 'success', message: 'Produto criado com sucesso.' })
      navigate(`/catalogo/${created.id}`)
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
        <h1 className="h3 mb-1">Novo produto</h1>
        <p className="text-muted mb-0">
          Escolha a categoria: para Contatora, Disjuntor motor e Seccionadora aparecem os
          parâmetros elétricos correspondentes ao modelo no backend.
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          {loadingCat && <p className="text-muted mb-0">Carregando categorias…</p>}
          {!loadingCat && categorias.length === 0 && (
            <div className="alert alert-warning mb-0" role="alert">
              Não há categorias ativas. Cadastre categorias no admin Django ou aguarde a
              carga inicial dos dados.
            </div>
          )}
          {!loadingCat && categorias.length > 0 && (
            <ProdutoForm
              categorias={categorias}
              initialData={initialData}
              onSubmit={handleSubmit}
              loading={createMutation.isPending}
            />
          )}
          <p className="small text-muted mt-3 mb-0">
            <Link to="/catalogo">Voltar à lista</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
