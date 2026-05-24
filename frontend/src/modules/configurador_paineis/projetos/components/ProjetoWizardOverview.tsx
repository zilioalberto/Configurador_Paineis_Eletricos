/**
 * Cards do resumo do wizard: cabeçalho, grade de etapas, ações rápidas,
 * checklist de conclusão e histórico de rastreabilidade.
 */

import { Link, useSearchParams } from 'react-router-dom'
import type { CargaListItem } from '@/modules/configurador_paineis/cargas/types/carga'
import type { ComposicaoSnapshot } from '@/modules/configurador_paineis/composicao/types/composicao'
import type { ResumoDimensionamento } from '@/modules/configurador_paineis/dimensionamento/types/dimensionamento'
import type { Projeto, ProjetoEvento } from '../types/projeto'
import type { ChecklistItem, ChecklistStatus, WizardStep, WizardStepId } from '../hooks/useProjetoWizardFluxo'
import { withFluxoOrigem } from '../utils/fluxoOrigem'
import { configuradorPaths } from '../../configuradorPaths'

export function badgeClass(done: boolean, active: boolean): string {
  if (active) return 'badge bg-primary'
  if (done) return 'badge bg-success'
  return 'badge bg-secondary'
}

export function checklistBadgeClass(status: ChecklistStatus): string {
  if (status === 'done') return 'badge bg-success'
  if (status === 'blocked') return 'badge bg-secondary'
  return 'badge bg-warning text-dark'
}

export function ProjetoWizardResumoHeader({
  projetoId,
  projeto,
  ultimoEvento,
  ultimaAcaoComUsuarioIdentificado,
  proxima,
}: {
  projetoId: string
  projeto: Projeto | undefined
  ultimoEvento: ProjetoEvento | undefined
  ultimaAcaoComUsuarioIdentificado: boolean
  proxima: WizardStep | null | undefined
}) {
  const [searchParams] = useSearchParams()
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h1 className="h3 mb-1">Resumo do fluxo</h1>
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
          Acompanhe o projeto: cargas, dimensionamento de condutores e composição do painel.
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
        <Link className="btn btn-outline-secondary" to={configuradorPaths.configuracaoDetalhe(projetoId)}>
          Ver detalhes
        </Link>
        {proxima ? (
          <Link className="btn btn-primary" to={withFluxoOrigem(proxima.href, searchParams)}>
            Continuar em {proxima.title}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export function ProjetoWizardStepsGrid({
  steps,
  etapaAtual,
}: {
  steps: WizardStep[]
  etapaAtual: WizardStepId
}) {
  const [searchParams] = useSearchParams()
  return (
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
                    to={step.canEnter ? withFluxoOrigem(step.href, searchParams) : '#'}
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
  )
}

export function ProjetoWizardAcoesRapidas({
  projetoId,
  cargas,
  temCargas,
  dimensionamento,
  dimensionamentoEtapaConcluida,
  composicao,
  recalcPending,
  gerarPending,
  reavaliarPending,
  onRecalcular,
  onGerarSugestoes,
  onReavaliarPendencias,
}: {
  projetoId: string
  cargas: CargaListItem[]
  temCargas: boolean
  dimensionamento: ResumoDimensionamento | undefined
  dimensionamentoEtapaConcluida: boolean
  composicao: ComposicaoSnapshot | undefined
  recalcPending: boolean
  gerarPending: boolean
  reavaliarPending: boolean
  onRecalcular: () => void
  onGerarSugestoes: () => void
  onReavaliarPendencias: () => void
}) {
  const [searchParams] = useSearchParams()
  return (
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
              <Link
                className="btn btn-sm btn-outline-primary"
                to={withFluxoOrigem(configuradorPaths.cargas(projetoId), searchParams)}
              >
                Gerenciar cargas
              </Link>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="border rounded p-3 h-100">
              <h3 className="h6">Dimensionamento de condutores</h3>
              <p className="small text-muted mb-2">
                {dimensionamento
                  ? `Corrente total: ${dimensionamento.corrente_total_painel_a} A`
                  : 'Sem cálculo salvo para este projeto.'}
              </p>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={!temCargas || recalcPending}
                  onClick={onRecalcular}
                >
                  {recalcPending ? 'Recalculando...' : 'Recalcular agora'}
                </button>
                <Link
                  className="btn btn-sm btn-outline-secondary"
                  to={withFluxoOrigem(configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento'), searchParams)}
                >
                  Abrir revisão de condutores
                </Link>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="border rounded p-3 h-100">
              <h3 className="h6">Composição do painel</h3>
              <p className="small text-muted mb-2">
                Sugestões: {composicao?.totais?.sugestoes ?? 0} | Pendências:{' '}
                {composicao?.totais?.pendencias ?? 0}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={!dimensionamentoEtapaConcluida || gerarPending}
                  onClick={onGerarSugestoes}
                >
                  {gerarPending ? 'Gerando...' : 'Gerar sugestões'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!dimensionamentoEtapaConcluida || reavaliarPending}
                  onClick={onReavaliarPendencias}
                >
                  {reavaliarPending ? 'Reavaliando...' : 'Reavaliar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProjetoWizardChecklistCard({
  checklist,
  projetoId,
  prontoParaExportar,
}: {
  checklist: ChecklistItem[]
  projetoId: string
  prontoParaExportar: boolean
}) {
  const [searchParams] = useSearchParams()
  return (
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
            to={withFluxoOrigem(configuradorPaths.composicao(projetoId), searchParams)}
            className={`btn btn-sm ${prontoParaExportar ? 'btn-success' : 'btn-outline-secondary'}`}
          >
            {prontoParaExportar ? 'Ir para exportação da composição' : 'Abrir composição'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export function ProjetoWizardHistoricoCard({ historico }: { historico: ProjetoEvento[] }) {
  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h5 mb-3">Rastreabilidade do projeto</h2>
        <p className="text-muted small">Registro das ações executadas por usuário no projeto.</p>
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
  )
}
