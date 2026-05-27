import { useMemo } from 'react'
import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { vincularProjetoConfiguradorPainel } from '@/modules/orcamentos/services/orcamentosApi'
import { orcamentoDetalhePath } from '@/modules/orcamentos/utils/orcamentoUi'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProjetoForm from '../components/projeto-form/ProjetoForm'
import { PROJETO_CONFIG_FORM_ID } from '../components/projeto-form/projetoFormIds'
import { projetoFormInitialState } from '../components/projeto-form/formOptions'
import { useCreateProjetoMutation } from '../hooks/useProjetoMutations'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { listarClientesProjeto } from '../services/projetoClienteService'
import { alocarCodigoProjeto, listarResponsaveisProjeto } from '../services/projetoService'
import { buildClienteSelectOptions, resolverClienteInicial } from '../utils/projetoClienteSelect'
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

/** Criação de projeto: aloca código sugerido e redireciona para cargas após salvar. */
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
  const {
    data: clientesCadastro = [],
    isPending: carregandoClientes,
    isError: erroClientes,
  } = useQuery({
    queryKey: [...projetoQueryKeys.all, 'clientes'],
    queryFn: listarClientesProjeto,
  })

  const clienteOptions = useMemo(
    () =>
      buildClienteSelectOptions(
        clientesCadastro,
        resolverClienteInicial(vinculoProposta.cliente, clientesCadastro)
      ),
    [clientesCadastro, vinculoProposta.cliente]
  )

  const initialData = useMemo(
    () => ({
      ...projetoFormInitialState,
      codigo: codigoResposta?.codigo ?? '',
      nome: vinculoProposta.nome || projetoFormInitialState.nome,
      cliente: resolverClienteInicial(vinculoProposta.cliente, clientesCadastro),
      responsavel:
        responsavelOptions.length === 1 ? responsavelOptions[0].id : projetoFormInitialState.responsavel,
    }),
    [
      clientesCadastro,
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
    navigate(configuradorPaths.cargas(projeto.id))
  }

  const submitLabel = vinculoProposta.orcamentoId ? 'Salvar e continuar' : 'Salvar configuração'

  const voltarConfiguracoes = configuradorPaths.configuracoes

  const toolbarConfig = useMemo(
    () => ({
      title: 'Nova configuração de painel',
      subtitle: vinculoProposta.orcamentoId
        ? 'Preencha os dados técnicos do painel vinculado à proposta'
        : 'Preencha os dados técnicos e salve para iniciar o fluxo do configurador',
      back: vinculoProposta.orcamentoId
        ? {
            to: orcamentoDetalhePath(vinculoProposta.orcamentoId),
            label: '← Proposta',
          }
        : undefined,
      actions: (
        <Link to={voltarConfiguracoes} className="btn btn-outline-light btn-sm">
          Cancelar
        </Link>
      ),
      primaryAction: {
        label: submitLabel,
        formId: PROJETO_CONFIG_FORM_ID,
        loading: createMutation.isPending,
        loadingLabel: 'Salvando…',
        disabled: carregandoCodigo,
      },
    }),
    [
      carregandoCodigo,
      createMutation.isPending,
      submitLabel,
      vinculoProposta.orcamentoId,
      voltarConfiguracoes,
    ]
  )

  useAppPageToolbar(toolbarConfig)

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
    <div className="container-fluid projeto-config-page projeto-config-page--full projeto-config-page--compact">
      {erroCodigo && (
        <div className="alert alert-warning py-2 d-flex flex-wrap align-items-center gap-2 mb-2">
          <span>
            Não foi possível obter a sugestão de código
            {erroAlocacao ? `: ${extrairMensagemErroApi(erroAlocacao) || 'erro de rede'}` : '.'}{' '}
            Você ainda pode preencher e salvar: um novo código será gerado no servidor.
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => void refetchCodigo()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {carregandoCodigo && (
        <p className="text-muted small mb-2">Carregando sugestão de código…</p>
      )}

      {erroClientes ? (
        <div className="alert alert-warning py-2 mb-2">
          Não foi possível carregar os clientes cadastrados. Atualize a página ou cadastre clientes
          em <Link to="/erp/cadastros">Cadastros comerciais</Link>.
        </div>
      ) : null}

      {!carregandoCodigo && (
        <ProjetoForm
          onSubmit={handleSubmit}
          onSubmitError={handleSubmitError}
          loading={createMutation.isPending}
          initialData={initialData}
          responsavelOptions={responsavelOptions}
          clienteOptions={clienteOptions}
          carregandoClientes={carregandoClientes}
          canEditResponsavel={canEditResponsavel}
          showStatus={false}
          submitLabel={submitLabel}
          formId={PROJETO_CONFIG_FORM_ID}
          workspaceLayout="grid"
        />
      )}
    </div>
  )
}
