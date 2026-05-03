import { tipoConexaoOptions } from './formOptions'
import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

export function ProjetoFormAlimentacaoSection({
  formData,
  onFieldChange,
  fieldErrors = {},
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus
  const errPot = fieldErrors.tipo_conexao_alimentacao_potencia
  const errNeutro = fieldErrors.tipo_conexao_alimentacao_neutro
  const errTerra = fieldErrors.tipo_conexao_alimentacao_terra

  return (
    <>
      <div className="col-12">
        <hr />
        <h2 className="h5">Alimentação</h2>
      </div>

      <ProjetoFormCheckboxField
        name="possui_neutro"
        label="Possui neutro"
        checked={formData.possui_neutro}
        onChange={onFieldChange}
        columnClassName="col-md-2"
        alignTop
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_terra"
        label="Possui terra"
        checked={formData.possui_terra}
        onChange={onFieldChange}
        columnClassName="col-md-2"
        alignTop
        disabled={ro}
      />

      <div className="col-md-4">
        <label className="form-label" htmlFor="projeto-form-conexao-potencia">
          Conexão alimentação potência
        </label>
        <select
          id="projeto-form-conexao-potencia"
          name="tipo_conexao_alimentacao_potencia"
          className={`form-select${errPot ? ' is-invalid' : ''}`}
          value={formData.tipo_conexao_alimentacao_potencia}
          onChange={onFieldChange}
          disabled={ro}
          aria-invalid={Boolean(errPot)}
          aria-describedby={errPot ? 'projeto-form-conexao-potencia-feedback' : undefined}
        >
          {renderSelectOptions(tipoConexaoOptions)}
        </select>
        {errPot ? (
          <div id="projeto-form-conexao-potencia-feedback" className="invalid-feedback d-block">
            {errPot}
          </div>
        ) : null}
      </div>

      <div className="col-md-4">
        <label className="form-label" htmlFor="projeto-form-conexao-neutro">
          Conexão alimentação neutro
        </label>
        <select
          id="projeto-form-conexao-neutro"
          name="tipo_conexao_alimentacao_neutro"
          className={`form-select${errNeutro ? ' is-invalid' : ''}`}
          value={formData.tipo_conexao_alimentacao_neutro ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_neutro}
          aria-invalid={Boolean(errNeutro)}
          aria-describedby={errNeutro ? 'projeto-form-conexao-neutro-feedback' : undefined}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(tipoConexaoOptions)}
        </select>
        {errNeutro ? (
          <div id="projeto-form-conexao-neutro-feedback" className="invalid-feedback d-block">
            {errNeutro}
          </div>
        ) : null}
      </div>

      <div className="col-md-4">
        <label className="form-label" htmlFor="projeto-form-conexao-terra">
          Conexão alimentação terra
        </label>
        <select
          id="projeto-form-conexao-terra"
          name="tipo_conexao_alimentacao_terra"
          className={`form-select${errTerra ? ' is-invalid' : ''}`}
          value={formData.tipo_conexao_alimentacao_terra ?? ''}
          onChange={onFieldChange}
          disabled={ro || !formData.possui_terra}
          aria-invalid={Boolean(errTerra)}
          aria-describedby={errTerra ? 'projeto-form-conexao-terra-feedback' : undefined}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(tipoConexaoOptions)}
        </select>
        {errTerra ? (
          <div id="projeto-form-conexao-terra-feedback" className="invalid-feedback d-block">
            {errTerra}
          </div>
        ) : null}
      </div>
    </>
  )
}
