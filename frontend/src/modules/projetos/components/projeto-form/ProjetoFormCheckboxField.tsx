import type { ProjetoFormFieldChangeHandler } from './projetoFormSectionProps'

type ProjetoFormCheckboxFieldProps = {
  name: string
  label: string
  checked: boolean
  onChange: ProjetoFormFieldChangeHandler
  columnClassName?: string
  /** Alinha verticalmente com selects na mesma linha (Bootstrap `mt-2`). */
  alignTop?: boolean
  disabled?: boolean
}

export function ProjetoFormCheckboxField({
  name,
  label,
  checked,
  onChange,
  columnClassName = 'col-md-3',
  alignTop = false,
  disabled = false,
}: ProjetoFormCheckboxFieldProps) {
  const wrapClass = alignTop ? 'form-check mt-2' : 'form-check'

  return (
    <div className={columnClassName}>
      <div className={wrapClass}>
        <input
          id={name}
          className="form-check-input"
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor={name}>
          {label}
        </label>
      </div>
    </div>
  )
}
