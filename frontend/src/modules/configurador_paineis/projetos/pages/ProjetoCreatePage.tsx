import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { vincularProjetoConfiguradorPainel } from '@/modules/erp/services/erpApi'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProjetoForm from '../components/projeto-form/ProjetoForm'
import { projetoFormInitialState } from '../components/projeto-form/formOptions'
import { useCreateProjetoMutation } from '../hooks/useProjetoMutations'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { alocarCodigoProjeto, listarResponsaveisProjeto } from '../services/projetoService'
import type { ProjetoFormData } from '../types/projeto'
import { withFluxoOrigem } from '../utils/fluxoOrigem'
import { configuradorPaths } from '../../configuradorPaths'

function usePropostaVinculoParams() {
  const location = useLocation()
  return useMemo(() => {
    const params = new URLSearchParams(location.search)
    const ordemRaw = params.get('ordem')
    const ordemPainel =
      ordemRaw != null && ordemRaw !== '' && !Number.isNaN(Number(ordemRaw))
        ? Number(ordemRaw)
        : 0
    return {
      orcamentoId: params.get('orcamento'),
      vinculoId: params.get('vinculo'),
      nome: params.get('nome')?.trim() ?? '',
      cliente: params.get('cliente')?.trim() ?? '',
      ordemPainel,
    }
  }, [location.search])
}

export default function ProjetoCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const createMutation = useCreateProjetoMutation()
  const canEditResponsavel = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
  const vinculoProposta = usePropostaVinculoParams()

  const {
    data: codigoResposta,
    isPending: carregandoCodigo,
    isError: erroCodigo,
    error: erroAlocacao,
    refetch: refetchCodigo,
  } = useQuery({
    queryKey: [
      ...projetoQueryKeys.all,
      'alocar-codigo',
      vinculoProposta.orcamentoId ?? '',
      vinculoProposta.ordemPainel,
      location.key,
    ],
    queryFn: () =>
      vinculoProposta.orcamentoId
        ? alocarCodigoProjeto({
            orcamento_id: vinculoProposta.orcamentoId,
            ordem_painel: vinculoProposta.ordemPainel,
          })
        : alocarCodigoProjeto(),
  })
  const { data: responsavelOptions = [] } = useQuery({
    queryKey: [...projetoQueryKeys.all, 'responsaveis'],
    queryFn: listarResponsaveisProjeto,
  })

  const initialData = useMemo(
    () => ({
      ...projetoFormInitialState,
      codigo: codigoResposta?.codigo ?? '',
      nome: vinculoProposta.nome || projetoFormInitialState.nome,
      cliente: vinculoProposta.cliente || projetoFormInitialState.cliente,
      responsavel:
        responsavelOptions.length === 1 ? responsavelOptions[0].id : projetoFormInitialState.responsavel,
    }),
    [
      codigoResposta?.codigo,
      responsavelOptions,
      vinculoProposta.cliente,
      vinculoProposta.nome,
    ]
  )

  async function handleSubmit(data: ProjetoFormData) {
    const projeto = await createMutation.mutateAsync(data)
    if (vinculoProposta.orcamentoId && vinculoProposta.vinculoId) {
      await vincularProjetoConfiguradorPainel(
        vinculoProposta.orcamentoId,
        vinculoProposta.vinculoId,
        projeto.id
      )
      showToast({
        variant: 'success',
        message: 'Configuração de painel criada e vinculada à proposta.',
      })
      navigate(
        withFluxoOrigem(
          configuradorPaths.cargas(projeto.id),
          new URLSearchParams(location.search)
        )
      )
      return
    }
    showToast({
      variant: 'success',
      message: 'Configuração de painel criada com sucesso.',
    })
    navigate(configuradorPaths.configuracaoDetalhe(projeto.id))
  }

  function handleSubmitError(err: unknown) {
    console.error('Erro ao criar configuração de painel:', err)
    const mensagemApi = extrairMensagemErroApi(err)
    showToast({
      variant: 'danger',
      title: 'Não foi possível criar a configuração',
      message: mensagemApi || 'Verifique os dados e tente novamente.',
    })
  }

  return (
    <div className="container-fluid projeto-config-page">
      <div className="projeto-config-header">
        <div className="min-w-0">
          {vinculoProposta.orcamentoId ? (
            <Link className="small d-inline-flex mb-2" to={`/erp/orcamentos/${vinculoProposta.orcamentoId}`}>
              ← Voltar à proposta
            </Link>
          ) : null}
          <h1 className="h3 mb-1">Nova configuração de painel</h1>
          <p className="text-muted mb-0">
            {vinculoProposta.orcamentoId
              ? 'Ao salvar, a configuração fica vinculada ao painel da proposta e segue para as etapas do configurador.'
              : 'Crie a configuração base do painel e avance para cargas, dimensionamento e composição.'}
          </p>
        </div>
        <div className="projeto-config-header__meta">
          <span className="badge text-bg-light border">
            {vinculoProposta.orcamentoId ? 'Vinculada à proposta' : 'Configuração avulsa'}
          </span>
          {codigoResposta?.codigo ? (
            <span className="badge text-bg-primary">{codigoResposta.codigo}</span>
          ) : null}
        </div>
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
        <ProjetoForm
          onSubmit={handleSubmit}
          onSubmitError={handleSubmitError}
          loading={createMutation.isPending}
          initialData={initialData}
          responsavelOptions={responsavelOptions}
          canEditResponsavel={canEditResponsavel}
          showStatus={false}
          submitLabel={vinculoProposta.orcamentoId ? 'Salvar e continuar' : 'Salvar configuração'}
        />
      )}
    </div>
  )
}
