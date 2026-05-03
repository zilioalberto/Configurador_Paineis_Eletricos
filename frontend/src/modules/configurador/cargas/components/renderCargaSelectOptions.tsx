type Opt = { value: string; label: string }

export function renderCargaSelectOptions(options: readonly Opt[]) {
  return options.map((o) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  ))
}
