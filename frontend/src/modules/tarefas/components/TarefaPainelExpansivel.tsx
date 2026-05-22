import type { ReactNode } from 'react'

export function TarefaPainelExpansivel({
  painelId,
  titulo,
  descricao,
  badge,
  aberto,
  onAlternar,
  children,
}: Readonly<{
  painelId: string
  titulo: string
  descricao: string
  badge: ReactNode
  aberto: boolean
  onAlternar: () => void
  children: ReactNode
}>) {
  const triggerId = `${painelId}-acc-trigger`
  const panelId = `${painelId}-acc-panel`
  return (
    <section className="tarefa-hours-log tarefa-hours-log--accordion mt-3">
      <button
        type="button"
        id={triggerId}
        className="tarefa-hours-log__accordion-trigger"
        aria-expanded={aberto}
        aria-controls={panelId}
        onClick={onAlternar}
      >
        <div className="tarefa-hours-log__header tarefa-hours-log__header--accordion mb-0">
          <div>
            <h3>{titulo}</h3>
            <p>{descricao}</p>
          </div>
          <span className="tarefa-hours-log__accordion-meta">
            {badge}
            <span className="tarefa-hours-log__accordion-chevron" aria-hidden>
              {aberto ? '▾' : '▸'}
            </span>
          </span>
        </div>
      </button>
      {aberto ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="tarefa-hours-log__accordion-body"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
