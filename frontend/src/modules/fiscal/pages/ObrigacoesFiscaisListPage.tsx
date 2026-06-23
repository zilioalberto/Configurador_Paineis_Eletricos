import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ChangeEvent, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import {
  criarPacoteObrigacao,
  listarPacotesObrigacoes,
  obterDashboardObrigacoes,
} from '../services/fiscalObrigacoesService'
import { formatCompetencia, formatMoedaBrl } from '../utils/fiscalDisplay'

function competenciaAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Lista competências e dashboard de obrigações fiscais. */
export default function ObrigacoesFiscaisListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const podeEditar = hasPermission(user, PERMISSION_KEYS.FISCAL_EDITAR)
  const [novaCompetencia, setNovaCompetencia] = useState(competenciaAtual())

  const { data: dashboard } = useQuery({
    queryKey: fiscalQueryKeys.obrigacoesDashboard,
    queryFn: obterDashboardObrigacoes,
  })
  const { data: pacotes = [], isFetching } = useQuery({
    queryKey: fiscalQueryKeys.obrigacoesPacotes,
    queryFn: listarPacotesObrigacoes,
  })

  const criarMutation = useMutation({
    mutationFn: () => criarPacoteObrigacao(novaCompetencia),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Competência criada', message: novaCompetencia })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacoesPacotes })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacoesDashboard })
    },
    onError: () => {
      showToast({ variant: 'danger', title: 'Erro', message: 'Não foi possível criar a competência.' })
    },
  })

  const onCompetenciaChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNovaCompetencia(e.target.value)
  }, [])

  return (
    <div className="container-fluid">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Obrigações fiscais
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Gestão de impostos</h1>
          <p className="text-muted mb-0">
            Importe o pacote mensal da contabilidade, acompanhe vencimentos e concilie com o ERP.
          </p>
        </div>
      </div>

      {dashboard && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="small text-muted">Pendente</div>
                <div className="h4 mb-0">{formatMoedaBrl(dashboard.total_pendente)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="small text-muted">Próximos 7 dias</div>
                <div className="h4 mb-0">{formatMoedaBrl(dashboard.total_vence_7_dias)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 border-danger">
              <div className="card-body">
                <div className="small text-muted">Vencidas</div>
                <div className="h4 mb-0 text-danger">{formatMoedaBrl(dashboard.total_vencido)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {podeEditar && (
        <div className="card mb-4">
          <div className="card-body d-flex flex-wrap gap-2 align-items-end">
            <div>
              <label htmlFor="nova-competencia" className="form-label small mb-1">
                Nova competência
              </label>
              <input
                id="nova-competencia"
                type="month"
                className="form-control"
                value={novaCompetencia}
                onChange={onCompetenciaChange}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={criarMutation.isPending}
              onClick={() => criarMutation.mutate()}
            >
              Criar pacote
            </button>
          </div>
        </div>
      )}

      {isFetching && <p className="text-muted">A carregar…</p>}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Competência</th>
              <th>Pacote completo</th>
              <th className="text-end">Obrigações</th>
              <th className="text-end">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pacotes.map((p) => (
              <tr key={p.public_id}>
                <td>{formatCompetencia(p.competencia)}</td>
                <td>
                  {p.pacote_completo ? (
                    <span className="badge bg-success">Completo</span>
                  ) : (
                    <span className="badge bg-warning text-dark">Incompleto</span>
                  )}
                </td>
                <td className="text-end">{p.total_obrigacoes ?? 0}</td>
                <td className="text-end">{formatMoedaBrl(p.total_pendente)}</td>
                <td className="text-end">
                  <Link
                    to={fiscalPaths.obrigacaoCompetencia(p.public_id)}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pacotes.length === 0 && !isFetching && (
        <p className="text-muted">Nenhuma competência cadastrada. Crie o pacote do mês e importe os PDFs.</p>
      )}
    </div>
  )
}
