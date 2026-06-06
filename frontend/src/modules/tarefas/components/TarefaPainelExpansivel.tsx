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
        <span className="tarefa-hours-log__header tarefa-hours-log__header--accordion mb-0">
          <span className="tarefa-hours-log__accordion-copy">
            <span className="tarefa-hours-log__title">{titulo}</span>
            <span className="tarefa-hours-log__description">{descricao}</span>
          </span>
          <span className="tarefa-hours-log__accordion-meta">
            {badge}
            <span className="tarefa-hours-log__accordion-chevron" aria-hidden>
              {aberto ? '▾' : '▸'}
            </span>
          </span>
        </span>
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
