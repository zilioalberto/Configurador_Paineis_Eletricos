import type { ChangeEvent } from 'react'
import type { CargaFormData } from '../types/carga'

type Props = Readonly<{
  formData: CargaFormData
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  controlClass: string
}>

/** Campos opcionais (local e observações) em bloco recolhível. */
export function CargaFormPanelExtras({ formData, onChange, controlClass }: Props) {
  return (
    <details className="carga-form-panel__details">
      <summary className="carga-form-panel__summary">Complementos (opcional)</summary>
      <div className="carga-form-panel__details-body row g-2">
        <div className="col-sm-6">
          <label className="form-label" htmlFor="carga-local-instalacao">
            Local de instalação
          </label>
          <input
            id="carga-local-instalacao"
            type="text"
            name="local_instalacao"
            className={controlClass}
            value={formData.local_instalacao}
            onChange={onChange}
            placeholder="Ex.: CCM, campo, sala elétrica"
          />
        </div>
        <div className="col-sm-6">
          <label className="form-label" htmlFor="carga-observacoes">
            Observações
          </label>
          <input
            id="carga-observacoes"
            type="text"
            name="observacoes"
            className={controlClass}
            value={formData.observacoes}
            onChange={onChange}
            placeholder="Notas adicionais"
          />
        </div>
      </div>
    </details>
  )
}
