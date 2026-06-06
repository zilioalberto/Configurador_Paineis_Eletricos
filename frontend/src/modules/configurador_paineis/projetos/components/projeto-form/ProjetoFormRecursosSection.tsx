import { usePlcFamiliasQuery } from '@/modules/catalogo/hooks/usePlcFamiliasQuery'
import { tipoClimatizacaoOptions } from './formOptions'
import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

/** Seção: PLC (família do catálogo), IHM, switches e climatização. */
export function ProjetoFormRecursosSection({
  formData,
  onFieldChange,
  fieldErrors = {},
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus
  const errPlc = fieldErrors.familia_plc
  const errClima = fieldErrors.tipo_climatizacao
  const { data: plcFamilias, isPending: carregandoFamiliasPlc } = usePlcFamiliasQuery({
    apenasEspecificacaoPlc: true,
  })
  const opcoesFamiliaPlc = plcFamilias?.familias ?? []

  return (
    <>
      <ProjetoFormCheckboxField
        name="possui_plc"
        label="Possui PLC"
        checked={formData.possui_plc}
        onChange={onFieldChange}
        columnClassName="col-6 col-md-4 col-lg-3"
        alignTop
        disabled={ro}
      />
      <div className="col-6 col-md-4 col-lg-3 projeto-form-field-narrow">
        <label className="form-label" htmlFor="projeto-form-familia-plc">
          Família do PLC
        </label>
        <select
          id="projeto-form-familia-plc"
          name="familia_plc"
          className={`form-select${errPlc ? ' is-invalid' : ''}`}
          value={formData.familia_plc ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_plc || carregandoFamiliasPlc}
          aria-invalid={Boolean(errPlc)}
          aria-describedby={errPlc ? 'projeto-form-familia-plc-feedback' : undefined}
        >
          <option value="">Selecione</option>
          {opcoesFamiliaPlc.map((familia) => (
            <option key={familia} value={familia}>
              {familia}
            </option>
          ))}
        </select>
        {errPlc ? (
          <div id="projeto-form-familia-plc-feedback" className="invalid-feedback d-block">
            {errPlc}
          </div>
        ) : null}
        {formData.possui_plc && opcoesFamiliaPlc.length === 0 && !carregandoFamiliasPlc ? (
          <p className="form-text text-muted mb-0">
            Cadastre um produto PLC no catálogo com família preenchida.
          </p>
        ) : null}
      </div>

      <ProjetoFormCheckboxField
        name="possui_ihm"
        label="Possui IHM"
        checked={formData.possui_ihm}
        onChange={onFieldChange}
        columnClassName="col-6 col-md-4 col-lg-3"
        disabled={ro}
      />
      <ProjetoFormCheckboxField
        name="possui_switches"
        label="Possui switches"
        checked={formData.possui_switches}
        onChange={onFieldChange}
        columnClassName="col-6 col-md-4 col-lg-3"
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_climatizacao"
        label="Possui climatização"
        checked={formData.possui_climatizacao}
        onChange={onFieldChange}
        columnClassName="col-6 col-md-4 col-lg-3"
        alignTop
        disabled={ro}
      />
      <div className="col-6 col-md-4 col-lg-3 projeto-form-field-narrow">
        <label className="form-label" htmlFor="projeto-form-tipo-climatizacao">
          Tipo de climatização
        </label>
        <select
          id="projeto-form-tipo-climatizacao"
          name="tipo_climatizacao"
          className={`form-select${errClima ? ' is-invalid' : ''}`}
          value={formData.tipo_climatizacao ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_climatizacao}
          aria-invalid={Boolean(errClima)}
          aria-describedby={errClima ? 'projeto-form-tipo-climatizacao-feedback' : undefined}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(tipoClimatizacaoOptions)}
        </select>
        {errClima ? (
          <div id="projeto-form-tipo-climatizacao-feedback" className="invalid-feedback d-block">
            {errClima}
          </div>
        ) : null}
      </div>
    </>
  )
}
