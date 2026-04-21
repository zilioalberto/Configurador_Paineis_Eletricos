import { tipoSeccionamentoOptions } from './formOptions'
import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

export function ProjetoFormSeccionamentoSection({
  formData,
  onFieldChange,
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus
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
        <label className="form-label">Tipo de seccionamento</label>
        <select
          name="tipo_seccionamento"
          className="form-select"
          value={formData.tipo_seccionamento ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_seccionamento}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(opcoesTipoSeccionamento)}
        </select>
      </div>
    </>
  )
}
