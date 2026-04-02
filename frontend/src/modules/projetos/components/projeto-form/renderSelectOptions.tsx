import type { FormOption } from './formOptions'

export function renderSelectOptions<T extends string | number>(
  options: FormOption<T>[]
) {
  return options.map((option) => (
    <option key={String(option.value)} value={option.value}>
      {option.label}
    </option>
  ))
}
