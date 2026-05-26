import { tipoCargaOptions } from '../utils/cargaFormDefaults'
import type { TipoCarga } from '../types/carga'

type Props = Readonly<{
  value: TipoCarga
  disabled?: boolean
  onSelect: (tipo: TipoCarga) => void
}>

/** Seletor visual de tipo de carga (pílulas). */
export function CargaTipoPills({ value, disabled, onSelect }: Props) {
  return (
    <div className="carga-tipo-pills" role="group" aria-label="Tipo de carga">
      {tipoCargaOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`carga-tipo-pills__item${value === opt.value ? ' is-active' : ''}`}
          disabled={disabled}
          aria-pressed={value === opt.value}
          title={opt.label}
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
