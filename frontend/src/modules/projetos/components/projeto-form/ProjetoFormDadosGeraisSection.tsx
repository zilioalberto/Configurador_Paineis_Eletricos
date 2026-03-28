import {
  frequenciaOptions,
  numeroFasesOptions,
  statusOptions,
  tipoCorrenteOptions,
  tipoPainelOptions,
} from './formOptions'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

export function ProjetoFormDadosGeraisSection({
  formData,
  onFieldChange,
}: ProjetoFormSectionProps) {
  return (
    <>
      <div className="col-md-4">
        <label className="form-label">Código</label>
        <input
          type="text"
          name="codigo"
          className="form-control"
          value={formData.codigo}
          onChange={onFieldChange}
          required
        />
      </div>

      <div className="col-md-8">
        <label className="form-label">Nome</label>
        <input
          type="text"
          name="nome"
          className="form-control"
          value={formData.nome}
          onChange={onFieldChange}
          required
        />
      </div>

      <div className="col-md-6">
        <label className="form-label">Cliente</label>
        <input
          type="text"
          name="cliente"
          className="form-control"
          value={formData.cliente}
          onChange={onFieldChange}
        />
      </div>

      <div className="col-md-3">
        <label className="form-label">Status</label>
        <select
          name="status"
          className="form-select"
          value={formData.status}
          onChange={onFieldChange}
        >
          {renderSelectOptions(statusOptions)}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label">Tipo de painel</label>
        <select
          name="tipo_painel"
          className="form-select"
          value={formData.tipo_painel}
          onChange={onFieldChange}
        >
          {renderSelectOptions(tipoPainelOptions)}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label">Tipo de corrente</label>
        <select
          name="tipo_corrente"
          className="form-select"
          value={formData.tipo_corrente}
          onChange={onFieldChange}
        >
          {renderSelectOptions(tipoCorrenteOptions)}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label">Tensão nominal</label>
        <input
          type="number"
          name="tensao_nominal"
          className="form-control"
          value={formData.tensao_nominal}
          onChange={onFieldChange}
          required
        />
      </div>

      {formData.tipo_corrente === 'CA' && (
        <>
          <div className="col-md-3">
            <label className="form-label">Número de fases</label>
            <select
              name="numero_fases"
              className="form-select"
              value={formData.numero_fases ?? ''}
              onChange={onFieldChange}
            >
              {renderSelectOptions(numeroFasesOptions)}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label">Frequência</label>
            <select
              name="frequencia"
              className="form-select"
              value={formData.frequencia ?? ''}
              onChange={onFieldChange}
            >
              {renderSelectOptions(frequenciaOptions)}
            </select>
          </div>
        </>
      )}

      <div className="col-md-3">
        <label className="form-label">Corrente de comando</label>
        <select
          name="tipo_corrente_comando"
          className="form-select"
          value={formData.tipo_corrente_comando}
          onChange={onFieldChange}
        >
          {renderSelectOptions(tipoCorrenteOptions)}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label">Tensão de comando</label>
        <input
          type="number"
          name="tensao_comando"
          className="form-control"
          value={formData.tensao_comando}
          onChange={onFieldChange}
          required
        />
      </div>

      <div className="col-md-3">
        <label className="form-label">Fator de demanda</label>
        <input
          type="text"
          name="fator_demanda"
          className="form-control"
          value={formData.fator_demanda}
          onChange={onFieldChange}
        />
      </div>

      <div className="col-12">
        <label className="form-label">Descrição</label>
        <textarea
          name="descricao"
          className="form-control"
          rows={4}
          value={formData.descricao}
          onChange={onFieldChange}
        />
      </div>
    </>
  )
}
