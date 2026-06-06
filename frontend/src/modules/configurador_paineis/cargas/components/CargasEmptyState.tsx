type Props = Readonly<{
  canManage: boolean
  onNovaCarga?: () => void
}>

/** Estado vazio da listagem de cargas com CTA para cadastrar. */
export function CargasEmptyState({ canManage, onNovaCarga }: Props) {
  return (
    <div className="cargas-empty-state text-center py-4 py-md-5">
      <div className="cargas-empty-state__icon mx-auto mb-3" aria-hidden>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="h6 mb-2">Nenhuma carga cadastrada</h3>
      <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: '28rem' }}>
        Cadastre motores, válvulas, sensores e demais cargas do painel para calcular correntes e
        avançar no dimensionamento.
      </p>
      {canManage ? (
        <button type="button" className="btn btn-primary" onClick={onNovaCarga}>
          Adicionar primeira carga
        </button>
      ) : (
        <p className="small text-muted mb-0">Sem permissão para cadastrar cargas.</p>
      )}
    </div>
  )
}
