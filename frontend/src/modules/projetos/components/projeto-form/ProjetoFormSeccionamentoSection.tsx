import { tipoSeccionamentoOptions } from './formOptions'
import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

export function ProjetoFormSeccionamentoSection({
  formData,
  onFieldChange,
  fieldErrors = {},
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus
  const errSec = fieldErrors.tipo_seccionamento
  const opcoesTipoSeccionamento = formData.possui_seccionamento
    ? tipoSeccionamentoOptions.filter((opt) => opt.value !== 'NENHUM')
    : tipoSeccionamentoOptions

  return (
    <>
      <div className="col-12">
        <hr />
        <h2 className="h5">Seccionamento</h2>
      </div>

      <ProjetoFormCheckboxField
        name="possui_seccionamento"
        label="Possui seccionamento"
        checked={formData.possui_seccionamento}
        onChange={onFieldChange}
        alignTop
        disabled={ro}
      />

      <div className="col-md-4">
        <label className="form-label" htmlFor="projeto-form-tipo-seccionamento">
          Tipo de seccionamento
        </label>
        <select
          id="projeto-form-tipo-seccionamento"
          name="tipo_seccionamento"
          className={`form-select${errSec ? ' is-invalid' : ''}`}
          value={formData.tipo_seccionamento ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_seccionamento}
          aria-invalid={Boolean(errSec)}
          aria-describedby={errSec ? 'projeto-form-tipo-seccionamento-feedback' : undefined}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(opcoesTipoSeccionamento)}
        </select>
        {errSec ? (
          <div id="projeto-form-tipo-seccionamento-feedback" className="invalid-feedback d-block">
            {errSec}
          </div>
        ) : null}
      </div>
    </>
  )
}
