import { tipoClimatizacaoOptions } from './formOptions'
import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

export function ProjetoFormRecursosSection({
  formData,
  onFieldChange,
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus

  return (
    <>
      <div className="col-12">
        <hr />
        <h2 className="h5">Recursos do painel</h2>
      </div>

      <ProjetoFormCheckboxField
        name="possui_plc"
        label="Possui PLC"
        checked={formData.possui_plc}
        onChange={onFieldChange}
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_ihm"
        label="Possui IHM"
        checked={formData.possui_ihm}
        onChange={onFieldChange}
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_switches"
        label="Possui switches"
        checked={formData.possui_switches}
        onChange={onFieldChange}
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_climatizacao"
        label="Possui climatização"
        checked={formData.possui_climatizacao}
        onChange={onFieldChange}
        disabled={ro}
      />

      <div className="col-md-4">
        <label className="form-label">Tipo de climatização</label>
        <select
          name="tipo_climatizacao"
          className="form-select"
          value={formData.tipo_climatizacao ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_climatizacao}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(tipoClimatizacaoOptions)}
        </select>
      </div>
    </>
  )
}
