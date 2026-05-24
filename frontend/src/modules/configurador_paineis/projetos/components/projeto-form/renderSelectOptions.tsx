import type { FormOption } from './formOptions'

/** Renderiza `<option>` a partir de lista `{ value, label }`. */
export function renderSelectOptions<T extends string | number>(
  options: FormOption<T>[]
) {
  return options.map((option) => (
    <option key={String(option.value)} value={option.value}>
      {option.label}
    </option>
  ))
}
