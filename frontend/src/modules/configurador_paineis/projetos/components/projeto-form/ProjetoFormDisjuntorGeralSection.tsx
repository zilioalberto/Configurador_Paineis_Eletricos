import { tipoDisjuntorGeralOptions } from './formOptions'
import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

/** Seção: disjuntor geral de proteção (minidisjuntor ou disjuntor caixa moldada). */
export function ProjetoFormDisjuntorGeralSection({
  formData,
  onFieldChange,
  fieldErrors = {},
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus
  const errTipo = fieldErrors.tipo_disjuntor_geral

  return (
    <>
      <ProjetoFormCheckboxField
        name="possui_disjuntor_geral"
        label="Possui disjuntor geral"
        checked={formData.possui_disjuntor_geral}
        onChange={onFieldChange}
        columnClassName="col-6 col-md-4 col-lg-3"
        alignTop
        disabled={ro}
      />
      <div className="col-6 col-md-4 col-lg-3 projeto-form-field-narrow">
        <label className="form-label" htmlFor="projeto-form-tipo-disjuntor-geral">
          Tipo de disjuntor geral
        </label>
        <select
          id="projeto-form-tipo-disjuntor-geral"
          name="tipo_disjuntor_geral"
          className={`form-select${errTipo ? ' is-invalid' : ''}`}
          value={formData.tipo_disjuntor_geral ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_disjuntor_geral}
          aria-invalid={Boolean(errTipo)}
          aria-describedby={errTipo ? 'projeto-form-tipo-disjuntor-geral-feedback' : undefined}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(tipoDisjuntorGeralOptions)}
        </select>
        {errTipo ? (
          <div
            id="projeto-form-tipo-disjuntor-geral-feedback"
            className="invalid-feedback d-block"
          >
            {errTipo}
          </div>
        ) : null}
      </div>
    </>
  )
}
