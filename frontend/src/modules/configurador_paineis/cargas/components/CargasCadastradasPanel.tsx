/** Painel com a lista de cargas cadastradas (estados de carregamento/erro/vazio). */
import CargaTable from './CargaTable'
import { CargasEmptyState } from './CargasEmptyState'
import type { CargaListItem } from '../types/carga'

export type CargasCadastradasPanelProps = Readonly<{
  cargas: CargaListItem[]
  loadingCargas: boolean
  isError: boolean
  loadError: unknown
  canManageCargas: boolean
  projetoId: string
  onNovaCarga: () => void
  onDeleteRequest: (id: string) => void
  onEditRequest: (id: string) => void
}>

export function CargasCadastradasPanel({
  cargas,
  loadingCargas,
  isError,
  loadError,
  canManageCargas,
  projetoId,
  onNovaCarga,
  onDeleteRequest,
  onEditRequest,
}: CargasCadastradasPanelProps) {
  const carregado = !loadingCargas && !isError
  return (
    <div className="card carga-list-panel">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 className="h6 mb-0">Cargas cadastradas</h2>
            {carregado ? (
              <p className="small text-muted mb-0">
                {cargas.length} {cargas.length === 1 ? 'carga' : 'cargas'}
              </p>
            ) : null}
          </div>
          {canManageCargas ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={onNovaCarga}>
              Nova carga
            </button>
          ) : null}
        </div>

        {loadingCargas ? <p className="mb-0 text-muted">Carregando cargas…</p> : null}

        {!loadingCargas && isError ? (
          <div className="alert alert-danger mb-0" role="alert">
            {loadError instanceof Error ? loadError.message : 'Não foi possível carregar as cargas.'}
          </div>
        ) : null}

        {carregado && cargas.length === 0 ? (
          <CargasEmptyState canManage={canManageCargas} onNovaCarga={onNovaCarga} />
        ) : null}

        {carregado && cargas.length > 0 ? (
          <CargaTable
            cargas={cargas}
            projetoId={projetoId}
            onDeleteRequest={onDeleteRequest}
            onEditRequest={onEditRequest}
            canManage={canManageCargas}
          />
        ) : null}
      </div>
    </div>
  )
}
