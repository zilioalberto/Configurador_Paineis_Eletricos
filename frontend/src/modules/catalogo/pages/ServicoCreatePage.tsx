import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ServicoForm from '../components/ServicoForm'
import { catalogoPaths } from '../catalogoPaths'
import { useCreateServicoMutation } from '../hooks/useServicoMutations'
import { servicoFormEmpty, servicoFormToApiPayload } from '../types/servico'
import type { ServicoFormData } from '../types/servico'

export default function ServicoCreatePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const createMutation = useCreateServicoMutation()
  const initialData = useMemo(() => servicoFormEmpty(), [])

  async function handleSubmit(data: ServicoFormData) {
    try {
      const created = await createMutation.mutateAsync(servicoFormToApiPayload(data))
      showToast({ variant: 'success', message: 'Serviço criado com sucesso.' })
      navigate(catalogoPaths.servicoEditar(created.id))
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
        <h1 className="h3 mb-1">Novo serviço</h1>
        <p className="text-muted mb-0">Cadastre um serviço para utilizar em propostas comerciais.</p>
      </div>
      <div className="card shadow-sm">
        <div className="card-body">
          <ServicoForm
            initialData={initialData}
            onSubmit={handleSubmit}
            loading={createMutation.isPending}
            submitLabel="Criar serviço"
          />
          <p className="small text-muted mt-3 mb-0">
            <Link to={catalogoPaths.servicos}>Voltar à lista</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
