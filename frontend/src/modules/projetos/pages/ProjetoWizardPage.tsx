import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useCargaListQuery } from '@/modules/cargas/hooks/useCargaListQuery'
import { useComposicaoSnapshotQuery } from '@/modules/composicao/hooks/useComposicaoSnapshotQuery'
import { useGerarSugestoesMutation } from '@/modules/composicao/hooks/useGerarSugestoesMutation'
import { useReavaliarPendenciasMutation } from '@/modules/composicao/hooks/useReavaliarPendenciasMutation'
import { useDimensionamentoQuery } from '@/modules/dimensionamento/hooks/useDimensionamentoQuery'
import { useRecalcularDimensionamentoMutation } from '@/modules/dimensionamento/hooks/useRecalcularDimensionamentoMutation'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useProjetoDetailQuery } from '../hooks/useProjetoDetailQuery'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { listarHistoricoProjeto } from '../services/projetoService'

type WizardStepId = 'projeto' | 'cargas' | 'dimensionamento' | 'composicao'

type WizardStep = {
  id: WizardStepId
  title: string
  description: string
  href: string
  canEnter: boolean
  done: boolean
}

type ChecklistStatus = 'done' | 'pending' | 'blocked'

const ETAPAS_VALIDAS: WizardStepId[] = [
  'projeto',
  'cargas',
  'dimensionamento',
  'composicao',
]

function badgeClass(done: boolean, active: boolean): string {
  if (active) return 'badge bg-primary'
  if (done) return 'badge bg-success'
  return 'badge bg-secondary'
}

function checklistBadgeClass(status: ChecklistStatus): string {
  if (status === 'done') return 'badge bg-success'
  if (status === 'blocked') return 'badge bg-secondary'
  return 'badge bg-warning text-dark'
}

export default function ProjetoWizardPage() {
  const { id, etapa } = useParams<{ id: string; etapa: string }>()
  const projetoId = id ?? ''
  const etapaAtual = ETAPAS_VALIDAS.includes((etapa as WizardStepId) ?? 'projeto')
    ? (etapa as WizardStepId)
    : 'projeto'

  const { showToast } = useToast()
  const { data: projeto, isPending: loadingProjeto } = useProjetoDetailQuery(projetoId || undefined)
  const { data: cargas = [] } = useCargaListQuery(projetoId || null)
  const { data: dimensionamento } = useDimensionamentoQuery(projetoId || null)
  const { data: composicao } = useComposicaoSnapshotQuery(projetoId || null)
  const recalcMutation = useRecalcularDimensionamentoMutation(projetoId || null)
  const gerarMutation = useGerarSugestoesMutation(projetoId || null)
  const reavaliarMutation = useReavaliarPendenciasMutation(projetoId || null)
  const { data: historico = [] } = useQuery({
    queryKey: projetoQueryKeys.historico(projetoId),
    queryFn: () => listarHistoricoProjeto(projetoId),
    enabled: Boolean(projetoId),
  })

  const temCargas = cargas.length > 0
  const dimensionado = Boolean(dimensionamento)
  const composicaoGerada = Boolean(
    composicao &&
      ((composicao.totais?.sugestoes ?? 0) > 0 ||
        (composicao.totais?.composicao_itens ?? 0) > 0 ||
        (composicao.totais?.pendencias ?? 0) > 0)
  )
  const maxCargaAtualizacaoMs = useMemo(() => {
    if (!temCargas) return 0
    return cargas.reduce((max, carga) => {
      const ts = carga.atualizado_em ? new Date(carga.atualizado_em).getTime() : 0
      return Math.max(max, ts)
    }, 0)
  }, [cargas, temCargas])
  const dimensionamentoAtualizacaoMs = dimensionamento?.atualizado_em
    ? new Date(dimensionamento.atualizado_em).getTime()
    : 0
  const dimensionamentoAposUltimaCarga =
    temCargas && dimensionado && dimensionamentoAtualizacaoMs >= maxCargaAtualizacaoMs
  const prontoParaExportar = temCargas && dimensionado && composicaoGerada
  const ultimoEvento = historico[0]
  const ultimaAcaoComUsuarioIdentificado = Boolean(
    ultimoEvento && (ultimoEvento.usuario_nome || ultimoEvento.usuario)
  )

  const checklist = useMemo(
    () => [
      {
        key: 'dados-projeto',
        label: 'Dados principais do projeto preenchidos',
        status: projeto ? ('done' as const) : ('pending' as const),
      },
      {
        key: 'cargas',
        label: 'Cargas cadastradas',
        status: temCargas ? ('done' as const) : ('pending' as const),
      },
      {
        key: 'dimensionamento',
        label: 'Dimensionamento calculado',
        status: temCargas ? (dimensionado ? ('done' as const) : ('pending' as const)) : ('blocked' as const),
      },
      {
        key: 'dimensionamento-recente',
        label: 'Dimensionamento atualizado após última alteração de cargas',
        status: !temCargas
          ? ('blocked' as const)
          : dimensionamentoAposUltimaCarga
            ? ('done' as const)
            : ('pending' as const),
      },
      {
        key: 'composicao',
        label: 'Composição gerada',
        status: !dimensionado ? ('blocked' as const) : composicaoGerada ? ('done' as const) : ('pending' as const),
      },
      {
        key: 'rastreabilidade-usuario',
        label: 'Última ação executada por usuário identificado',
        status: historico.length === 0
          ? ('pending' as const)
          : ultimaAcaoComUsuarioIdentificado
            ? ('done' as const)
            : ('pending' as const),
      },
    ],
    [
      projeto,
      temCargas,
      dimensionado,
      dimensionamentoAposUltimaCarga,
      composicaoGerada,
      historico.length,
      ultimaAcaoComUsuarioIdentificado,
    ]
  )

  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: 'projeto',
        title: 'Projeto',
        description: 'Revise ou ajuste os dados de entrada do projeto.',
        href: `/projetos/${projetoId}/editar`,
        canEnter: true,
        done: Boolean(projeto),
      },
      {
        id: 'cargas',
        title: 'Cargas',
        description: 'Cadastre as cargas do projeto para liberar dimensionamento.',
        href: `/cargas?projeto=${encodeURIComponent(projetoId)}`,
        canEnter: Boolean(projeto),
        done: temCargas,
      },
      {
        id: 'dimensionamento',
        title: 'Dimensionamento',
        description: 'Recalcule o dimensionamento com base nas cargas atuais.',
        href: `/cargas?projeto=${encodeURIComponent(projetoId)}#dimensionamento-resumo`,
        canEnter: temCargas,
        done: dimensionado,
      },
      {
        id: 'composicao',
        title: 'Composição',
        description: 'Gere e aprove a composição para exportação final.',
        href: `/composicao?projeto=${encodeURIComponent(projetoId)}`,
        canEnter: dimensionado,
        done: composicaoGerada,
      },
    ],
    [projetoId, projeto, temCargas, dimensionado, composicaoGerada]
  )

  const etapaIndex = steps.findIndex((s) => s.id === etapaAtual)
  const proxima = etapaIndex >= 0 ? steps.slice(etapaIndex).find((s) => !s.done && s.canEnter) : null

  const onRecalcular = useCallback(async () => {
    try {
      await recalcMutation.mutateAsync()
      showToast({ variant: 'success', message: 'Dimensionamento recalculado no wizard.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao recalcular',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [recalcMutation, showToast])

  const onGerarSugestoes = useCallback(async () => {
    try {
      const data = await gerarMutation.mutateAsync(true)
      const erros = data.geracao?.erros_etapas ?? []
      showToast({
        variant: erros.length > 0 ? 'warning' : 'success',
        message:
          erros.length > 0
            ? 'Composição gerada com avisos. Revise as pendências.'
            : 'Sugestões de composição geradas com sucesso.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao gerar composição',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [gerarMutation, showToast])

  const onReavaliarPendencias = useCallback(async () => {
    try {
      await reavaliarMutation.mutateAsync()
      showToast({ variant: 'success', message: 'Pendências reavaliadas no wizard.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao reavaliar pendências',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [reavaliarMutation, showToast])

  if (!id) {
    return <Navigate to="/projetos" replace />
  }

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Wizard do Projeto</h1>
          <div className="mb-2">
            <span
              className={`badge ${
                ultimaAcaoComUsuarioIdentificado ? 'bg-success' : 'bg-warning text-dark'
              }`}
            >
              {ultimaAcaoComUsuarioIdentificado ? 'Audit trail ativo' : 'Audit trail pendente'}
            </span>
          </div>
          <p className="text-muted mb-0">
            Fluxo guiado para concluir painel: cargas, dimensionamento e composição.
          </p>
          {projeto ? (
            <p className="small text-muted mb-0 mt-1">
              <strong>{projeto.codigo}</strong> - {projeto.nome}
            </p>
          ) : null}
          {projeto?.responsavel_nome ? (
            <p className="small text-muted mb-0 mt-1">
              Responsável atual: <strong>{projeto.responsavel_nome}</strong>
            </p>
          ) : null}
          {ultimoEvento ? (
            <p className="small text-muted mb-0 mt-1">
              Última ação: <strong>{ultimoEvento.descricao}</strong> por{' '}
              <strong>{ultimoEvento.usuario_nome || 'Utilizador não identificado'}</strong> em{' '}
              {new Date(ultimoEvento.criado_em).toLocaleString()}.
            </p>
          ) : (
            <p className="small text-muted mb-0 mt-1">
              Última ação: ainda não há eventos registrados para este projeto.
            </p>
          )}
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-secondary" to={`/projetos/${id}`}>
            Ver detalhes
          </Link>
          {proxima ? (
            <Link className="btn btn-primary" to={proxima.href}>
              Continuar em {proxima.title}
            </Link>
          ) : null}
        </div>
      </div>

      {loadingProjeto ? <p className="text-muted">Carregando projeto...</p> : null}

      <div className="row g-3 mb-4">
        {steps.map((step) => {
          const active = step.id === etapaAtual
          return (
            <div className="col-12 col-lg-6" key={step.id}>
              <div className={`card h-100 ${active ? 'border-primary' : ''}`}>
                <div className="card-body d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <h2 className="h5 mb-0">{step.title}</h2>
                    <span className={badgeClass(step.done, active)}>
                      {step.done ? 'Concluída' : active ? 'Atual' : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-muted small mb-0">{step.description}</p>
                  <div className="mt-auto">
                    <Link
                      className={`btn btn-sm ${step.canEnter ? 'btn-outline-primary' : 'btn-outline-secondary disabled'}`}
                      to={step.canEnter ? step.href : '#'}
                      aria-disabled={!step.canEnter}
                      onClick={(e) => {
                        if (!step.canEnter) e.preventDefault()
                      }}
                    >
                      Abrir etapa
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Ações rápidas do fluxo</h2>
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="border rounded p-3 h-100">
                <h3 className="h6">Cargas</h3>
                <p className="small text-muted mb-2">
                  {temCargas ? `${cargas.length} carga(s) cadastrada(s).` : 'Nenhuma carga cadastrada.'}
                </p>
                <Link className="btn btn-sm btn-outline-primary" to={`/cargas?projeto=${encodeURIComponent(projetoId)}`}>
                  Gerenciar cargas
                </Link>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="border rounded p-3 h-100">
                <h3 className="h6">Dimensionamento</h3>
                <p className="small text-muted mb-2">
                  {dimensionamento
                    ? `Corrente total: ${dimensionamento.corrente_total_painel_a} A`
                    : 'Sem cálculo salvo para este projeto.'}
                </p>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={!temCargas || recalcMutation.isPending}
                    onClick={() => void onRecalcular()}
                  >
                    {recalcMutation.isPending ? 'Recalculando...' : 'Recalcular agora'}
                  </button>
                  <Link
                    className="btn btn-sm btn-outline-secondary"
                    to={`/cargas?projeto=${encodeURIComponent(projetoId)}#dimensionamento-resumo`}
                  >
                    Ver em cargas
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="border rounded p-3 h-100">
                <h3 className="h6">Composição</h3>
                <p className="small text-muted mb-2">
                  Sugestões: {composicao?.totais?.sugestoes ?? 0} | Pendências: {composicao?.totais?.pendencias ?? 0}
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={!dimensionado || gerarMutation.isPending}
                    onClick={() => void onGerarSugestoes()}
                  >
                    {gerarMutation.isPending ? 'Gerando...' : 'Gerar sugestões'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!dimensionado || reavaliarMutation.isPending}
                    onClick={() => void onReavaliarPendencias()}
                  >
                    {reavaliarMutation.isPending ? 'Reavaliando...' : 'Reavaliar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Checklist de conclusão</h2>
          <ul className="list-group mb-3">
            {checklist.map((item) => (
              <li
                key={item.key}
                className="list-group-item d-flex justify-content-between align-items-center gap-2"
              >
                <span>{item.label}</span>
                <span className={checklistBadgeClass(item.status)}>
                  {item.status === 'done'
                    ? 'Concluído'
                    : item.status === 'blocked'
                      ? 'Bloqueado'
                      : 'Pendente'}
                </span>
              </li>
            ))}
          </ul>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <strong>Status final:</strong>{' '}
              {prontoParaExportar ? (
                <span className="text-success">Pronto para exportação</span>
              ) : (
                <span className="text-muted">Fluxo técnico ainda não concluído</span>
              )}
            </div>
            <Link
              to={`/composicao?projeto=${encodeURIComponent(projetoId)}`}
              className={`btn btn-sm ${prontoParaExportar ? 'btn-success' : 'btn-outline-secondary'}`}
            >
              {prontoParaExportar ? 'Ir para exportação da composição' : 'Abrir composição'}
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Rastreabilidade do projeto</h2>
          <p className="text-muted small">
            Registro das ações executadas por usuário no projeto.
          </p>
          {historico.length === 0 ? (
            <p className="small text-muted mb-0">Ainda não há eventos registrados.</p>
          ) : (
            <ul className="list-group">
              {historico.slice(0, 15).map((evento) => (
                <li className="list-group-item" key={evento.id}>
                  <div className="d-flex justify-content-between gap-3 flex-wrap">
                    <div>
                      <strong>{evento.descricao}</strong>
                      <div className="small text-muted">
                        {evento.usuario_nome || 'Utilizador não identificado'} - {evento.modulo}
                      </div>
                    </div>
                    <span className="small text-muted">
                      {new Date(evento.criado_em).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
