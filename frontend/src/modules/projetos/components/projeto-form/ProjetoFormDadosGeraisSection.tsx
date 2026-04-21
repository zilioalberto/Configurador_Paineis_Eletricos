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
  responsavelOptions = [],
  canEditResponsavel = false,
  showStatus = true,
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus

  return (
    <>
      {showStatus ? (
        <div className="col-12">
          <div className="projeto-form-status-panel rounded-3 border p-3 p-md-4">
            <div className="row g-3 align-items-end">
              <div className="col-md-5 col-lg-4">
                <label className="form-label fw-semibold mb-1" htmlFor="projeto-form-status">
                  Status do projeto
                </label>
                <select
                  id="projeto-form-status"
                  name="status"
                  className="form-select form-select-lg"
                  value={formData.status}
                  onChange={onFieldChange}
                >
                  {renderSelectOptions(statusOptions)}
                </select>
              </div>
              <div className="col-md-7 col-lg-8">
                {ro ? (
                  <p className="small text-muted mb-0 projeto-form-status-hint" role="status">
                    Com status <strong>Finalizado</strong>, os demais campos ficam bloqueados para
                    edição. Use <strong>Salvar</strong> para gravar esta situação. Para alterar
                    outros dados, mude para <strong>Em andamento</strong>, salve e edite
                    normalmente.
                  </p>
                ) : (
                  <p className="small text-muted mb-0">
                    Defina se o projeto segue em elaboração ou já foi encerrado. Alterações nos
                    demais campos só são permitidas com status <strong>Em andamento</strong>.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="col-md-4">
        <label className="form-label">Código</label>
        <input
          type="text"
          name="codigo"
          className="form-control"
          value={formData.codigo}
          onChange={onFieldChange}
          readOnly
          disabled={ro}
          placeholder="Gerado ao salvar (MMnnn-AA)"
          title="O código é definido pelo sistema ao criar o projeto."
        />
        <p className="form-text small text-muted mb-0">
          Gerado ao abrir &quot;Novo projeto&quot; e gravado apenas ao salvar (MMnnn-AA, ex. 04001-26).
        </p>
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
          disabled={ro}
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
          disabled={ro}
        />
      </div>

      <div className="col-md-6">
        <label className="form-label">Responsável</label>
        <select
          name="responsavel"
          className="form-select"
          value={formData.responsavel ?? ''}
          onChange={onFieldChange}
          disabled={ro || !canEditResponsavel}
        >
          <option value="">Não definido</option>
          {responsavelOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label">Tipo de painel</label>
        <select
          name="tipo_painel"
          className="form-select"
          value={formData.tipo_painel}
          onChange={onFieldChange}
          disabled={ro}
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
          disabled={ro}
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
          disabled={ro}
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
              disabled={ro}
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
              disabled={ro}
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
          disabled={ro}
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
          disabled={ro}
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
          disabled={ro}
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
          disabled={ro}
        />
      </div>
    </>
  )
}
