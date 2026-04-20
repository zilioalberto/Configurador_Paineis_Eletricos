import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useDashboardResumoQuery } from '../hooks/useDashboardResumoQuery'
import type { ProjetoDashboardMini } from '../types/dashboard'

function badgeClassStatus(status: string): string {
  switch (status) {
    case 'FINALIZADO':
      return 'badge bg-success'
    case 'EM_ANDAMENTO':
      return 'badge bg-warning text-dark'
    default:
      return 'badge bg-light text-dark'
  }
}

function formatarDataHora(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function KpiCard({
  title,
  value,
  footer,
}: {
  title: string
  value: number | string
  footer?: ReactNode
}) {
  return (
    <div className="col-sm-6 col-xl-4">
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          <div className="text-muted small text-uppercase fw-semibold">{title}</div>
          <div className="display-6 fw-semibold mt-1">{value}</div>
          {footer ? <div className="mt-2 small">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}

function LinhaProjetoRecente({
  p,
  canViewComposicao,
  canViewCargas,
}: {
  p: ProjetoDashboardMini
  canViewComposicao: boolean
  canViewCargas: boolean
}) {
  const q = encodeURIComponent(p.id)
  return (
    <tr>
      <td className="fw-semibold">
        <Link to={`/projetos/${p.id}`}>{p.codigo}</Link>
      </td>
      <td>{p.nome}</td>
      <td>
        <span className={badgeClassStatus(p.status)}>{p.status_display}</span>
      </td>
      <td className="text-muted small">{formatarDataHora(p.atualizado_em)}</td>
      <td className="text-end text-nowrap">
        <Link className="btn btn-sm btn-outline-primary me-1" to={`/projetos/${p.id}`}>
          Ver
        </Link>
        {canViewComposicao ? (
          <Link className="btn btn-sm btn-outline-secondary me-1" to={`/composicao?projeto=${q}`}>
            Composição
          </Link>
        ) : null}
        {canViewCargas ? (
          <Link className="btn btn-sm btn-outline-secondary" to={`/cargas?projeto=${q}`}>
            Cargas
          </Link>
        ) : null}
      </td>
    </tr>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const canViewProjetos = hasPermission(user, PERMISSION_KEYS.PROJETO_VISUALIZAR)
  const canViewComposicao = hasPermission(user, PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS)
  const canViewCatalogo = hasPermission(user, PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA)
  const canViewCargas = hasPermission(user, PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA)
  const canViewDimensionamento = hasPermission(user, PERMISSION_KEYS.PROJETO_VISUALIZAR)
  const { data, isPending, isError, error, refetch, isFetching } = useDashboardResumoQuery()

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h3 mb-0">Dashboard</h1>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          Atualizar
        </button>
      </div>

      {isPending && (
        <div className="card">
          <div className="card-body text-muted">A carregar resumo…</div>
        </div>
      )}

      {isError && (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar o resumo do painel.
          {error && 'message' in error ? ` ${String(error.message)}` : ''}
        </div>
      )}

      {data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="text-muted small text-uppercase fw-semibold">
                    Projetos ativos
                  </div>
                  <div className="display-6 fw-semibold mt-1">{data.projetos.total}</div>
                  <div className="mt-2 small text-muted">
                    <span className="me-3">
                      Em andamento:{' '}
                      <strong className="text-body">{data.projetos.em_andamento}</strong>
                    </span>
                    <span>
                      Finalizados:{' '}
                      <strong className="text-body">{data.projetos.finalizados}</strong>
                    </span>
                  </div>
                  {canViewProjetos ? (
                    <Link className="small d-inline-block mt-2" to="/projetos">
                      Ver lista de projetos →
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
            <KpiCard
              title="Pendências abertas"
              value={data.composicao.pendencias_abertas}
              footer={
                canViewComposicao ? (
                  <Link className="link-secondary" to="/composicao">
                    Abrir composição →
                  </Link>
                ) : null
              }
            />
            <KpiCard
              title="Sugestões pendentes"
              value={data.composicao.sugestoes_pendentes}
              footer={
                <span className="text-muted">
                  Aprovar ou rejeitar na composição por projeto.
                </span>
              }
            />
            <KpiCard
              title="Produtos ativos (catálogo)"
              value={data.catalogo.produtos_ativos}
              footer={
                canViewCatalogo ? (
                  <Link className="link-secondary" to="/catalogo">
                    Gerir catálogo →
                  </Link>
                ) : null
              }
            />
            <KpiCard
              title="Cargas ativas"
              value={data.cargas.total}
              footer={
                canViewCargas ? (
                  <Link className="link-secondary" to="/cargas">
                    Ver cargas →
                  </Link>
                ) : null
              }
            />
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h5 card-title">Fluxo sugerido</h2>
              <p className="card-text text-muted mb-0">
                Crie ou escolha um{' '}
                {canViewProjetos ? <Link to="/projetos">projeto</Link> : 'projeto'}
                , cadastre {canViewCargas ? <Link to="/cargas">cargas</Link> : 'cargas'},
                execute o{' '}
                {canViewDimensionamento ? (
                  <Link to="/dimensionamento">dimensionamento</Link>
                ) : (
                  'dimensionamento'
                )}{' '}
                e, em seguida, use a{' '}
                {canViewComposicao ? <Link to="/composicao">composição</Link> : 'composição'} para gerar sugestões, resolver
                pendências e aprovar itens.
              </p>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Projetos recentes</span>
              <span className="text-muted small">Ordenados por última atualização</span>
            </div>
            <div className="card-body p-0">
              {data.projetos_recentes.length === 0 ? (
                <p className="p-3 mb-0 text-muted">Ainda não há projetos ativos.</p>
              ) : (
                <div className="table-responsive app-data-table">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nome</th>
                        <th>Status</th>
                        <th>Atualizado</th>
                        <th className="text-end">Atalhos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.projetos_recentes.map((p) => (
                        <LinhaProjetoRecente
                          key={p.id}
                          p={p}
                          canViewComposicao={canViewComposicao}
                          canViewCargas={canViewCargas}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
