import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { ERP_MODULES, type ErpModule } from '../moduleCatalog'

function moduleVisible(user: ReturnType<typeof useAuth>['user'], module: ErpModule): boolean {
  if (module.status !== 'available') return false
  const permissions = module.permissions ?? []
  if (permissions.length === 0) return true
  return permissions.some((permission) => hasPermission(user, permission))
}

function ModuleCard({
  module,
  available,
}: Readonly<{
  module: ErpModule
  available: boolean
}>) {
  return (
    <article className={`module-card h-100${available ? '' : ' module-card--planned'}`}>
      <div className="module-card__body">
        <div className="module-card__meta">
          <span>{module.area}</span>
          <span className={`module-card__status${available ? ' is-available' : ''}`}>
            {available ? 'Disponível' : 'Planejado'}
          </span>
        </div>
        <h3 className="module-card__title">{module.title}</h3>
        <p className="module-card__summary">{module.summary}</p>
        <div className="module-card__actions">
          {available && module.to ? (
            <Link
              className="btn btn-primary btn-sm"
              to={module.to}
              aria-label={`Acessar ${module.title}`}
            >
              Acessar
            </Link>
          ) : (
            <button className="btn btn-outline-secondary btn-sm" type="button" disabled>
              Planejado
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function ModuleLauncherPage() {
  const { user } = useAuth()
  const availableModules = ERP_MODULES.filter((module) => moduleVisible(user, module))
  const plannedModules = ERP_MODULES.filter((module) => module.status === 'planned')

  return (
    <div className="container-fluid module-launcher">
      <div className="module-launcher-hero mb-4">
        <div className="min-w-0">
          <div className="module-launcher-eyebrow">Portal ZFW</div>
          <h1 className="h3 mb-1">Central de módulos</h1>
          <p className="text-muted mb-0">
            Acesse os módulos disponíveis e acompanhe a evolução planejada do ERP.
          </p>
        </div>
        <div className="module-launcher-count" aria-label="Módulos planejados no ERP">
          <strong>{ERP_MODULES.length}</strong>
          <span>módulos mapeados</span>
        </div>
      </div>

      <section className="mb-4" aria-labelledby="available-modules-heading">
        <div className="module-section-heading">
          <h2 className="h5 mb-1" id="available-modules-heading">
            Liberados para seu usuário
          </h2>
          <p className="text-muted mb-0">
            Atalhos operacionais para os módulos que já podem ser usados.
          </p>
        </div>

        {availableModules.length === 0 ? (
          <div className="alert alert-warning" role="alert">
            Nenhum módulo liberado para o seu usuário.
          </div>
        ) : (
          <div className="module-grid module-grid--available">
            {availableModules.map((module) => (
              <ModuleCard available key={module.id} module={module} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="planned-modules-heading">
        <div className="module-section-heading">
          <h2 className="h5 mb-1" id="planned-modules-heading">
            Roadmap do ERP
          </h2>
          <p className="text-muted mb-0">
            Módulos previstos para completar o fluxo comercial, operacional e gerencial.
          </p>
        </div>

        <div className="module-grid">
          {plannedModules.map((module) => (
            <ModuleCard available={false} key={module.id} module={module} />
          ))}
        </div>
      </section>
    </div>
  )
}
