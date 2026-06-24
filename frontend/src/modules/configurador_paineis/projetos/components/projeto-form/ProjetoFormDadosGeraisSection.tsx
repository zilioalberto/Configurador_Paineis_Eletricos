import {
  frequenciaOptions,
  numeroFasesOptions,
  statusOptions,
  tipoCorrenteOptions,
  tipoPainelOptions,
} from './formOptions'
import { Link } from 'react-router-dom'

import type { ProjetoFormSectionProps } from './projetoFormSectionProps'
import { renderSelectOptions } from './renderSelectOptions'

/** Seção: identificação, alimentação principal, comando e margem de bitola. */
export function ProjetoFormDadosGeraisSection({
  formData,
  onFieldChange,
  responsavelOptions = [],
  clienteOptions = [],
  carregandoClientes = false,
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
        <label className="form-label" htmlFor="projeto-form-codigo">
          Código
        </label>
        <input
          id="projeto-form-codigo"
          type="text"
          name="codigo"
          className="form-control"
          value={formData.codigo}
          onChange={onFieldChange}
          readOnly
          disabled={ro}
          placeholder="CONF-05008-26 ou MMnnn-AA"
          title="Código da configuração de painel."
        />
        <p className="form-text small text-muted mb-0">
          Proposta: CONF-MMnnn-AA · avulso: MMnnn-AA
        </p>
      </div>

      <div className="col-md-8">
        <label className="form-label" htmlFor="projeto-form-nome">
          Nome
        </label>
        <input
          id="projeto-form-nome"
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
        <label className="form-label" htmlFor="projeto-form-cliente">
          Cliente
        </label>
        <select
          id="projeto-form-cliente"
          name="cliente"
          className="form-select"
          value={formData.cliente}
          onChange={onFieldChange}
          disabled={ro || carregandoClientes}
          required={clienteOptions.length > 0}
        >
          <option value="">
            {carregandoClientes ? 'Carregando clientes…' : 'Selecione o cliente…'}
          </option>
          {clienteOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {!carregandoClientes && clienteOptions.length === 0 ? (
          <p className="form-text small text-muted mb-0">
            Nenhum cliente ativo no cadastro.{' '}
            <Link to="/erp/cadastros">Cadastrar parceiro como cliente</Link>.
          </p>
        ) : null}
      </div>

      <div className="col-md-6">
        <label className="form-label" htmlFor="projeto-form-responsavel">
          Responsável
        </label>
        <select
          id="projeto-form-responsavel"
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
        <label className="form-label" htmlFor="projeto-form-tipo-painel">
          Tipo de painel
        </label>
        <select
          id="projeto-form-tipo-painel"
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
        <label className="form-label" htmlFor="projeto-form-tipo-corrente">
          Tipo de corrente
        </label>
        <select
          id="projeto-form-tipo-corrente"
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
        <label className="form-label" htmlFor="projeto-form-tensao-nominal">
          Tensão nominal
        </label>
        <input
          id="projeto-form-tensao-nominal"
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
            <label className="form-label" htmlFor="projeto-form-numero-fases">
              Número de fases
            </label>
            <select
              id="projeto-form-numero-fases"
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
            <label className="form-label" htmlFor="projeto-form-frequencia">
              Frequência
            </label>
            <select
              id="projeto-form-frequencia"
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
        <label className="form-label" htmlFor="projeto-form-tipo-corrente-comando">
          Corrente de comando
        </label>
        <select
          id="projeto-form-tipo-corrente-comando"
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
        <label className="form-label" htmlFor="projeto-form-tensao-comando">
          Tensão de comando
        </label>
        <input
          id="projeto-form-tensao-comando"
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
        <label className="form-label" htmlFor="projeto-form-fator-demanda">
          Fator de demanda
        </label>
        <input
          id="projeto-form-fator-demanda"
          type="text"
          name="fator_demanda"
          className="form-control"
          value={formData.fator_demanda}
          onChange={onFieldChange}
          disabled={ro}
        />
      </div>
    </>
  )
}
