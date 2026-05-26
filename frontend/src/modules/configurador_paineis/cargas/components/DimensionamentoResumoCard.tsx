import type { ResumoDimensionamento } from '@/modules/configurador_paineis/dimensionamento/types/dimensionamento'

type Props = Readonly<{
  resumo: ResumoDimensionamento | null | undefined
  loading: boolean
  isError: boolean
  error: unknown
  totalCargas: number
  autoRecalcFeedback?: string
}>

function formatCorrente(valor: string | number | null | undefined): string {
  const n = Number(valor)
  if (!Number.isFinite(n)) return valor != null && valor !== '' ? String(valor) : '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Resumo compacto de dimensionamento na listagem de cargas. */
export function DimensionamentoResumoCard({
  resumo,
  loading,
  isError,
  error,
  totalCargas,
  autoRecalcFeedback,
}: Props) {
  return (
    <div className="card dimensionamento-resumo-card mt-3" id="dimensionamento-resumo">
      <div className="card-body">
        <div className="mb-3">
          <h2 className="h6 mb-1">Dimensionamento</h2>
          <p className="small text-muted mb-0">
            Prévia com base em {totalCargas} carga(s) cadastrada(s)
          </p>
        </div>

        {autoRecalcFeedback ? (
          <p className="small text-muted mb-3">{autoRecalcFeedback}</p>
        ) : null}

        {loading ? <p className="text-muted small mb-0">Carregando dimensionamento…</p> : null}

        {!loading && isError ? (
          <div className="alert alert-warning mb-0 py-2 small" role="alert">
            {error instanceof Error
              ? error.message
              : 'Não foi possível carregar o dimensionamento.'}
          </div>
        ) : null}

        {!loading && !isError && resumo ? (
          <div className="dimensionamento-resumo-kpis row g-3">
            <div className="col-sm-6 col-lg-4">
              <div className="dimensionamento-resumo-kpi">
                <span className="dimensionamento-resumo-kpi__label">Corrente total de entrada</span>
                <span className="dimensionamento-resumo-kpi__value">
                  {formatCorrente(resumo.corrente_total_painel_a)}
                  <span className="dimensionamento-resumo-kpi__unit"> A</span>
                </span>
              </div>
            </div>
            <div className="col-sm-6 col-lg-4">
              <div className="dimensionamento-resumo-kpi">
                <span className="dimensionamento-resumo-kpi__label">Cargas consideradas</span>
                <span className="dimensionamento-resumo-kpi__value">{totalCargas}</span>
              </div>
            </div>
            {resumo.atualizado_em ? (
              <div className="col-12 col-lg-4">
                <div className="dimensionamento-resumo-kpi dimensionamento-resumo-kpi--meta">
                  <span className="dimensionamento-resumo-kpi__label">Última atualização</span>
                  <span className="dimensionamento-resumo-kpi__value dimensionamento-resumo-kpi__value--sm">
                    {new Date(resumo.atualizado_em).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !isError && !resumo && totalCargas === 0 ? (
          <p className="small text-muted mb-0">
            Cadastre ao menos uma carga para gerar o dimensionamento.
          </p>
        ) : null}
      </div>
    </div>
  )
}
