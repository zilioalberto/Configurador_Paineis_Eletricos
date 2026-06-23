import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterDashboardObrigacoes } from '../services/fiscalObrigacoesService'
import { formatMoedaBrl } from '../utils/fiscalDisplay'

/** Card resumo de impostos/obrigações na home fiscal. */
export default function FiscalObrigacoesDashboardCard() {
  const { data, isPending, isError } = useQuery({
    queryKey: fiscalQueryKeys.obrigacoesDashboard,
    queryFn: obterDashboardObrigacoes,
  })

  if (isPending) return null
  if (isError || !data) return null

  return (
    <div className="card mb-4 border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="h6 mb-1">Obrigações fiscais mensais</h2>
            <p className="small text-muted mb-0">
              Guias da contabilidade (DAS, INSS, FGTS, ISS, ICMS) com conciliação automática.
            </p>
          </div>
          <Link to={fiscalPaths.obrigacoes} className="btn btn-sm btn-outline-primary">
            Gerir impostos
          </Link>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <div className="small text-muted">Total pendente</div>
            <div className="fw-semibold">{formatMoedaBrl(data.total_pendente)}</div>
          </div>
          <div className="col-md-4">
            <div className="small text-muted">Vence em 7 dias</div>
            <div className="fw-semibold">
              {formatMoedaBrl(data.total_vence_7_dias)}{' '}
              <span className="text-muted small">({data.quantidade_vence_7_dias})</span>
            </div>
          </div>
          <div className="col-md-4">
            <div className="small text-muted">Vencidas</div>
            <div className="fw-semibold text-danger">
              {formatMoedaBrl(data.total_vencido)}{' '}
              <span className="small">({data.quantidade_vencidas})</span>
            </div>
          </div>
        </div>

        {data.alertas.length > 0 && (
          <div className="alert alert-warning small mb-0" role="alert">
            {data.alertas.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
