import type { NfesEmitidasOrdenacaoCampo } from '../utils/nfesEmitidasOrdering'
import { ariaSortEmitidas } from '../utils/nfesEmitidasOrdering'

type SortableTableHeaderProps = {
  readonly label: string
  readonly field: NfesEmitidasOrdenacaoCampo
  readonly ordering: string
  readonly onSort: (field: NfesEmitidasOrdenacaoCampo) => void
  readonly className?: string
}

function SortIndicator({ field, ordering }: Readonly<{ field: NfesEmitidasOrdenacaoCampo; ordering: string }>) {
  if (ordering === field) {
    return (
      <span className="text-primary ms-1" aria-hidden>
        ▲
      </span>
    )
  }
  if (ordering === `-${field}`) {
    return (
      <span className="text-primary ms-1" aria-hidden>
        ▼
      </span>
    )
  }
  return (
    <span className="text-muted opacity-50 ms-1" aria-hidden>
      ⇅
    </span>
  )
}

/** Cabeçalho de coluna ordenável (asc → desc → padrão). */
export default function SortableTableHeader({
  label,
  field,
  ordering,
  onSort,
  className = '',
}: SortableTableHeaderProps) {
  return (
    <th className={className} aria-sort={ariaSortEmitidas(field, ordering)}>
      <button
        type="button"
        className="btn btn-link btn-sm p-0 text-decoration-none text-reset fw-semibold border-0 d-inline-flex align-items-center"
        onClick={() => onSort(field)}
      >
        {label}
        <SortIndicator field={field} ordering={ordering} />
      </button>
    </th>
  )
}
