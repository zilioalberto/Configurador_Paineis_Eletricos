import { tipoConexaoOptions } from './formOptions'
import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

export function ProjetoFormAlimentacaoSection({
  formData,
  onFieldChange,
}: ProjetoFormSectionProps) {
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
      />

      <ProjetoFormCheckboxField
        name="possui_terra"
        label="Possui terra"
        checked={formData.possui_terra}
        onChange={onFieldChange}
        columnClassName="col-md-2"
        alignTop
      />

      <div className="col-md-4">
        <label className="form-label">Conexão alimentação potência</label>
        <select
          name="tipo_conexao_alimentacao_potencia"
          className="form-select"
          value={formData.tipo_conexao_alimentacao_potencia}
          onChange={onFieldChange}
        >
          {renderSelectOptions(tipoConexaoOptions)}
        </select>
      </div>

      <div className="col-md-4">
        <label className="form-label">Conexão alimentação neutro</label>
        <select
          name="tipo_conexao_alimentacao_neutro"
          className="form-select"
          value={formData.tipo_conexao_alimentacao_neutro ?? ''}
          onChange={onFieldChange}
          disabled={!formData.possui_neutro}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(tipoConexaoOptions)}
        </select>
      </div>

      <div className="col-md-4">
        <label className="form-label">Conexão alimentação terra</label>
        <select
          name="tipo_conexao_alimentacao_terra"
          className="form-select"
          value={formData.tipo_conexao_alimentacao_terra ?? ''}
          onChange={onFieldChange}
          disabled={!formData.possui_terra}
        >
          <option value="">Selecione</option>
          {renderSelectOptions(tipoConexaoOptions)}
        </select>
      </div>
    </>
  )
}
