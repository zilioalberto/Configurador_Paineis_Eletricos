import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import ProjetoForm from '../components/ProjetoForm'
import { useCreateProjetoMutation } from '../hooks/useProjetoMutations'
import type { ProjetoFormData } from '../types/projeto'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

export default function ProjetoCreatePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const createMutation = useCreateProjetoMutation()

  async function handleSubmit(data: ProjetoFormData) {
    try {
      const projeto = await createMutation.mutateAsync(data)
      showToast({
        variant: 'success',
        message: 'Projeto criado com sucesso.',
      })
      navigate(`/projetos/${projeto.id}`)
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      const mensagemApi = extrairMensagemErroApi(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível criar o projeto',
        message: mensagemApi || 'Verifique os dados e tente novamente.',
      })
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h1 className="h3 mb-1">Novo Projeto</h1>
        <p className="text-muted mb-0">
          Preencha os dados iniciais do projeto.
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          <ProjetoForm
            onSubmit={handleSubmit}
            loading={createMutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
