import { useEffect, useMemo, useRef } from 'react'
import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import ProjetoForm from '../components/ProjetoForm'
import { PROJETO_CONFIG_FORM_ID } from '../components/projeto-form/projetoFormIds'
import { useProjetoDetailQuery } from '../hooks/useProjetoDetailQuery'
import { useUpdateProjetoMutation } from '../hooks/useProjetoMutations'
import type { Projeto, ProjetoFormData } from '../types/projeto'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { listarClientesProjeto } from '../services/projetoClienteService'
import { listarResponsaveisProjeto } from '../services/projetoService'
import { buildClienteSelectOptions } from '../utils/projetoClienteSelect'
import { configuradorPaths } from '../../configuradorPaths'

/** Converte entidade da API para estado inicial do formulário de edição. */
function projetoParaFormData(projeto: Projeto): ProjetoFormData {
  return {
    codigo: projeto.codigo ?? '',
    nome: projeto.nome ?? '',
    descricao: projeto.descricao ?? '',
    cliente: projeto.cliente ?? '',

    status: projeto.status,
    tipo_painel: projeto.tipo_painel,

    tipo_corrente: projeto.tipo_corrente,
    tensao_nominal: projeto.tensao_nominal ?? '',
    numero_fases: projeto.numero_fases,
    frequencia: projeto.frequencia,

    possui_neutro: projeto.possui_neutro,
    possui_terra: projeto.possui_terra,

    tipo_conexao_alimentacao_potencia: projeto.tipo_conexao_alimentacao_potencia,
    tipo_conexao_alimentacao_neutro: projeto.tipo_conexao_alimentacao_neutro,
    tipo_conexao_alimentacao_terra: projeto.tipo_conexao_alimentacao_terra,

    tipo_corrente_comando: projeto.tipo_corrente_comando,
    tensao_comando: projeto.tensao_comando ?? '',

    possui_plc: projeto.possui_plc,
    familia_plc: projeto.familia_plc ?? null,
    possui_ihm: projeto.possui_ihm,
    possui_switches: projeto.possui_switches,
    possui_plaqueta_identificacao: projeto.possui_plaqueta_identificacao,
    possui_faixa_identificacao: projeto.possui_faixa_identificacao,
    possui_adesivo_alerta: projeto.possui_adesivo_alerta,
    possui_adesivos_tensao: projeto.possui_adesivos_tensao,

    possui_climatizacao: projeto.possui_climatizacao,
    tipo_climatizacao: projeto.tipo_climatizacao,

    fator_demanda: projeto.fator_demanda ?? '1.00',

    degraus_margem_bitola_condutores: projeto.degraus_margem_bitola_condutores ?? 1,

    possui_seccionamento: projeto.possui_seccionamento,
    tipo_seccionamento:
      projeto.possui_seccionamento && projeto.tipo_seccionamento === 'NENHUM'
        ? null
        : projeto.tipo_seccionamento,
    responsavel: projeto.responsavel ?? null,
  }
}

/** Edição de projeto existente; mapeia API → formulário e persiste via mutation. */
export default function ProjetoEditPage() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const loadErrorToastSent = useRef(false)

  const {
    data: projeto,
    isPending: loadingProjeto,
    isError: isLoadError,
    error: loadQueryError,
    refetch,
  } = useProjetoDetailQuery(id)

  const updateMutation = useUpdateProjetoMutation()
  const canEditResponsavel = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
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
    () => buildClienteSelectOptions(clientesCadastro, projeto?.cliente ?? ''),
    [clientesCadastro, projeto?.cliente]
  )

  useEffect(() => {
    loadErrorToastSent.current = false
  }, [id])

  useEffect(() => {
    if (!isLoadError || !loadQueryError || loadErrorToastSent.current) {
      return
    }
    loadErrorToastSent.current = true
    showToast({
      variant: 'danger',
      title: 'Erro ao carregar projeto',
      message:
        loadQueryError instanceof Error
          ? loadQueryError.message
          : 'Não foi possível carregar os dados do projeto.',
    })
  }, [isLoadError, loadQueryError, showToast])

  async function handleSubmit(data: ProjetoFormData) {
    if (!id) return

    const projetoAtualizado = await updateMutation.mutateAsync({ id, data })
    showToast({
      variant: 'success',
      message: 'Projeto atualizado com sucesso.',
    })
    navigate(searchParams.get('retorno') || configuradorPaths.cargas(projetoAtualizado.id))
  }

  function handleSubmitError(err: unknown) {
    console.error('Erro ao atualizar projeto:', err)
    const mensagemApi = extrairMensagemErroApi(err)
    showToast({
      variant: 'danger',
      title: 'Não foi possível atualizar o projeto',
      message: mensagemApi || 'Verifique os dados e tente novamente.',
    })
  }

  const initialData = projeto ? projetoParaFormData(projeto) : undefined

  const toolbarConfig = useMemo(() => {
    if (!id) return null
    return {
      title: 'Editar configuração de painel',
      primaryAction: {
        label: 'Salvar alterações',
        formId: PROJETO_CONFIG_FORM_ID,
        loading: updateMutation.isPending,
        loadingLabel: 'Salvando…',
        disabled: loadingProjeto || isLoadError || !initialData,
      },
    }
  }, [
    id,
    initialData,
    isLoadError,
    loadingProjeto,
    projeto,
    updateMutation.isPending,
  ])

  useAppPageToolbar(toolbarConfig)

  return (
    <div className="container-fluid projeto-config-page projeto-config-page--full projeto-config-page--compact">

      {!id && (
        <div className="alert alert-danger" role="alert">
          Projeto não informado.
        </div>
      )}

      {id && loadingProjeto && (
        <p className="text-muted small mb-2">Carregando dados do projeto…</p>
      )}

      {id && !loadingProjeto && isLoadError && (
        <div className="card border-0 shadow-sm">
          <div className="card-body d-flex flex-wrap align-items-center gap-3">
            <p className="text-danger mb-0">
              Não foi possível carregar os dados desta configuração.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => void refetch()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {erroClientes ? (
        <div className="alert alert-warning py-2 mb-2">
          Não foi possível carregar os clientes cadastrados. Atualize a página ou cadastre clientes em{' '}
          <Link to="/erp/cadastros">Cadastros comerciais</Link>.
        </div>
      ) : null}

      {id && !loadingProjeto && !isLoadError && initialData && (
        <ProjetoForm
          key={id}
          onSubmit={handleSubmit}
          onSubmitError={handleSubmitError}
          loading={updateMutation.isPending}
          initialData={initialData}
          responsavelOptions={responsavelOptions}
          clienteOptions={clienteOptions}
          carregandoClientes={carregandoClientes}
          canEditResponsavel={canEditResponsavel}
          showStatus={false}
          submitLabel="Salvar alterações"
          formId={PROJETO_CONFIG_FORM_ID}
        />
      )}
    </div>
  )
}
