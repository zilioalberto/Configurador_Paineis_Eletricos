import { usePlcFamiliasQuery } from '../hooks/usePlcFamiliasQuery'

type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  fieldId?: string
}

export function PlcFamiliaCampo({
  label,
  value,
  onChange,
  fieldId = 'spec-plc-familia',
}: Props) {
  const { data } = usePlcFamiliasQuery()
  const listId = `${fieldId}-sugestoes`
  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        className="form-control"
        list={listId}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {(data?.familias ?? []).map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <p className="form-text small text-muted mb-0">
        Escolha uma família já usada no catálogo ou digite outra. O servidor normaliza o texto
        e impede duplicar nomes muito parecidos.
      </p>
    </div>
  )
}
