import { toggleColaborador } from '../utils/tarefasKanbanUtils'

export function ColaboradoresChecklist({
  labelId,
  colaboradores,
  disabled,
  responsaveis,
  onChange,
}: Readonly<{
  labelId: string
  colaboradores: string[]
  disabled: boolean
  responsaveis: Array<{ id: number; label: string; email: string }>
  onChange: (colaboradores: string[]) => void
}>) {
  if (responsaveis.length === 0) {
    return (
      <div className="tarefa-collaborators-picker is-empty" aria-labelledby={labelId}>
        Nenhum colaborador disponível.
      </div>
    )
  }

  return (
    <fieldset className="tarefa-collaborators-picker" aria-labelledby={labelId}>
      {responsaveis.map((responsavel) => {
        const value = String(responsavel.id)
        return (
          <label className="tarefa-collaborators-picker__option" key={responsavel.id}>
            <input
              type="checkbox"
              checked={colaboradores.includes(value)}
              disabled={disabled}
              onChange={() => onChange(toggleColaborador(colaboradores, value))}
            />
            <span>
              <strong>{responsavel.label}</strong>
              <small>{responsavel.email}</small>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
