import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ServicoForm from '../components/ServicoForm'
import { catalogoPaths } from '../catalogoPaths'
import { useServicoDetailQuery } from '../hooks/useServicoDetailQuery'
import { useUpdateServicoMutation } from '../hooks/useServicoMutations'
import {
  servicoDetailToForm,
  servicoFormToApiPayload,
  type ServicoFormData,
} from '../types/servico'

export default function ServicoEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: servico, isPending, isError, error, refetch } = useServicoDetailQuery(id)
  const updateMutation = useUpdateServicoMutation()

  const initialData = useMemo(
    () => (servico ? servicoDetailToForm(servico) : null),
    [servico]
  )

  async function handleSubmit(data: ServicoFormData) {
    if (!id) return
    try {
      await updateMutation.mutateAsync({ id, body: servicoFormToApiPayload(data) })
      showToast({ variant: 'success', message: 'Serviço atualizado.' })
      navigate(catalogoPaths.servicos)
    } catch (err) {
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
        <h1 className="h3 mb-1">Editar serviço</h1>
        {servico ? (
          <p className="text-muted mb-0">
            {servico.codigo} · {servico.descricao}
          </p>
        ) : null}
      </div>
      <div className="card shadow-sm">
        <div className="card-body">
          {isPending ? <p className="text-muted mb-0">Carregando…</p> : null}
          {isError ? (
            <div className="alert alert-danger mb-0">
              {extrairMensagemErroApi(error) || 'Erro ao carregar serviço.'}
              <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => void refetch()}>
                Tentar novamente
              </button>
            </div>
          ) : null}
          {initialData ? (
            <ServicoForm
              key={id}
              initialData={initialData}
              onSubmit={handleSubmit}
              loading={updateMutation.isPending}
            />
          ) : null}
          <p className="small text-muted mt-3 mb-0">
            <Link to={catalogoPaths.servicos}>Voltar à lista</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
