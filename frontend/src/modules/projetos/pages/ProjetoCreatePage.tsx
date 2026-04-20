import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProjetoForm from '../components/projeto-form/ProjetoForm'
import { projetoFormInitialState } from '../components/projeto-form/formOptions'
import { useCreateProjetoMutation } from '../hooks/useProjetoMutations'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { alocarCodigoProjeto, listarResponsaveisProjeto } from '../services/projetoService'
import type { ProjetoFormData } from '../types/projeto'

export default function ProjetoCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const createMutation = useCreateProjetoMutation()
  const canEditResponsavel = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)

  const {
    data: codigoResposta,
    isPending: carregandoCodigo,
    isError: erroCodigo,
    error: erroAlocacao,
    refetch: refetchCodigo,
  } = useQuery({
    queryKey: [...projetoQueryKeys.all, 'alocar-codigo', location.key],
    queryFn: alocarCodigoProjeto,
  })
  const { data: responsavelOptions = [] } = useQuery({
    queryKey: [...projetoQueryKeys.all, 'responsaveis'],
    queryFn: listarResponsaveisProjeto,
  })

  const initialData = useMemo(
    () => ({
      ...projetoFormInitialState,
      codigo: codigoResposta?.codigo ?? '',
      responsavel:
        responsavelOptions.length === 1 ? responsavelOptions[0].id : projetoFormInitialState.responsavel,
    }),
    [codigoResposta?.codigo, responsavelOptions]
  )

  async function handleSubmit(data: ProjetoFormData) {
    try {
      const projeto = await createMutation.mutateAsync(data)
      showToast({
        variant: 'success',
        message: 'Projeto criado com sucesso.',
      })
      navigate(`/cargas?projeto=${encodeURIComponent(projeto.id)}`)
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
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="h3 mb-1">Novo Projeto</h1>
        <p className="text-muted mb-0">
          A sugestão de código é calculada a partir dos projetos já salvos neste mês. Só passa a
          existir de fato quando você salvar; abrir a página sem salvar não consome sequência.
        </p>
      </div>

      {erroCodigo && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2 mb-3">
          <span>
            Não foi possível obter a sugestão de código
            {erroAlocacao ? `: ${extrairMensagemErroApi(erroAlocacao) || 'erro de rede'}` : '.'}{' '}
            Você ainda pode preencher e salvar: um novo código será gerado no servidor.
          </span>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => void refetchCodigo()}>
            Tentar novamente
          </button>
        </div>
      )}

      {carregandoCodigo && (
        <div className="card mb-3">
          <div className="card-body py-4 text-muted">Carregando sugestão de código…</div>
        </div>
      )}

      {!carregandoCodigo && (
        <div className="card">
          <div className="card-body">
            <ProjetoForm
              onSubmit={handleSubmit}
              loading={createMutation.isPending}
              initialData={initialData}
              responsavelOptions={responsavelOptions}
              canEditResponsavel={canEditResponsavel}
              showStatus={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
