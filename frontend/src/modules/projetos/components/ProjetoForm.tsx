import { useState } from 'react'
import type { ProjetoFormData } from '../types/projeto'

type ProjetoFormProps = {
  onSubmit: (data: ProjetoFormData) => Promise<void>
  loading?: boolean
}

const initialState: ProjetoFormData = {
  codigo: '',
  nome: '',
  descricao: '',
  cliente: '',

  status: 'RASCUNHO',
  tipo_painel: 'AUTOMACAO',

  tipo_corrente: 'CA',
  tensao_nominal: '',
  numero_fases: 3,
  frequencia: 60,

  possui_neutro: true,
  possui_terra: true,

  tipo_conexao_alimentacao_potencia: 'BORNE',
  tipo_conexao_alimentacao_neutro: 'BORNE',
  tipo_conexao_alimentacao_terra: 'BORNE',

  tipo_corrente_comando: 'CA',
  tensao_comando: '',

  possui_plc: false,
  possui_ihm: false,
  possui_switches: false,
  possui_plaqueta_identificacao: false,
  possui_faixa_identificacao: false,
  possui_adesivo_alerta: false,
  possui_adesivos_tensao: false,

  possui_climatizacao: false,
  tipo_climatizacao: null,

  fator_demanda: '1.00',

  possui_seccionamento: false,
  tipo_seccionamento: null,
}

export default function ProjetoForm({
  onSubmit,
  loading = false,
}: ProjetoFormProps) {
  const [formData, setFormData] = useState<ProjetoFormData>(initialState)

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target

    if (type === 'checkbox' && event.target instanceof HTMLInputElement) {
      const checked = event.target.checked

      setFormData((prev) => {
        const updated = {
          ...prev,
          [name]: checked,
        }

        if (name === 'possui_neutro' && !checked) {
          updated.tipo_conexao_alimentacao_neutro = null
        }

        if (name === 'possui_terra' && !checked) {
          updated.tipo_conexao_alimentacao_terra = null
        }

        if (name === 'possui_climatizacao' && !checked) {
          updated.tipo_climatizacao = null
        }

        if (name === 'possui_seccionamento' && !checked) {
          updated.tipo_seccionamento = null
        }

        return updated
      })

      return
    }

    setFormData((prev) => {
      const updatedValue =
        value === ''
          ? ''
          : ['tensao_nominal', 'tensao_comando', 'numero_fases', 'frequencia'].includes(name)
            ? Number(value)
            : value

      const updated = {
        ...prev,
        [name]: updatedValue,
      }

      if (name === 'tipo_corrente' && value === 'CC') {
        updated.numero_fases = null
        updated.frequencia = null
        updated.possui_neutro = false
        updated.tipo_conexao_alimentacao_neutro = null
      }

      if (name === 'tipo_corrente' && value === 'CA') {
        if (updated.numero_fases === null) updated.numero_fases = 3
        if (updated.frequencia === null) updated.frequencia = 60
      }

      return updated
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: ProjetoFormData = {
      ...formData,
      numero_fases: formData.tipo_corrente === 'CC' ? null : formData.numero_fases,
      frequencia: formData.tipo_corrente === 'CC' ? null : formData.frequencia,
      tipo_conexao_alimentacao_neutro: formData.possui_neutro
        ? formData.tipo_conexao_alimentacao_neutro
        : null,
      tipo_conexao_alimentacao_terra: formData.possui_terra
        ? formData.tipo_conexao_alimentacao_terra
        : null,
      tipo_climatizacao: formData.possui_climatizacao
        ? formData.tipo_climatizacao
        : null,
      tipo_seccionamento: formData.possui_seccionamento
        ? formData.tipo_seccionamento
        : null,
    }

    await onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label">Código</label>
          <input
            type="text"
            name="codigo"
            className="form-control"
            value={formData.codigo}
            onChange={handleChange}
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
            onChange={handleChange}
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
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Status</label>
          <select
            name="status"
            className="form-select"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="RASCUNHO">Rascunho</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">Tipo de painel</label>
          <select
            name="tipo_painel"
            className="form-select"
            value={formData.tipo_painel}
            onChange={handleChange}
          >
            <option value="AUTOMACAO">Automação</option>
            <option value="DISTRIBUICAO">Distribuição</option>
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">Tipo de corrente</label>
          <select
            name="tipo_corrente"
            className="form-select"
            value={formData.tipo_corrente}
            onChange={handleChange}
          >
            <option value="CA">CA</option>
            <option value="CC">CC</option>
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">Tensão nominal</label>
          <input
            type="number"
            name="tensao_nominal"
            className="form-control"
            value={formData.tensao_nominal}
            onChange={handleChange}
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
                onChange={handleChange}
              >
                <option value={1}>Monofásico</option>
                <option value={2}>Bifásico</option>
                <option value={3}>Trifásico</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Frequência</label>
              <select
                name="frequencia"
                className="form-select"
                value={formData.frequencia ?? ''}
                onChange={handleChange}
              >
                <option value={50}>50 Hz</option>
                <option value={60}>60 Hz</option>
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
            onChange={handleChange}
          >
            <option value="CA">CA</option>
            <option value="CC">CC</option>
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">Tensão de comando</label>
          <input
            type="number"
            name="tensao_comando"
            className="form-control"
            value={formData.tensao_comando}
            onChange={handleChange}
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
            onChange={handleChange}
          />
        </div>

        <div className="col-12">
          <label className="form-label">Descrição</label>
          <textarea
            name="descricao"
            className="form-control"
            rows={4}
            value={formData.descricao}
            onChange={handleChange}
          />
        </div>

        <div className="col-12">
          <hr />
          <h2 className="h5">Alimentação</h2>
        </div>

        <div className="col-md-2">
          <div className="form-check mt-2">
            <input
              id="possui_neutro"
              className="form-check-input"
              type="checkbox"
              name="possui_neutro"
              checked={formData.possui_neutro}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_neutro">
              Possui neutro
            </label>
          </div>
        </div>

        <div className="col-md-2">
          <div className="form-check mt-2">
            <input
              id="possui_terra"
              className="form-check-input"
              type="checkbox"
              name="possui_terra"
              checked={formData.possui_terra}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_terra">
              Possui terra
            </label>
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label">Conexão alimentação potência</label>
          <select
            name="tipo_conexao_alimentacao_potencia"
            className="form-select"
            value={formData.tipo_conexao_alimentacao_potencia}
            onChange={handleChange}
          >
            <option value="BARRAMENTO">Barramento</option>
            <option value="BORNE">Borne</option>
            <option value="TOMADA">Tomada</option>
            <option value="DIRETO">Direto</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Conexão alimentação neutro</label>
          <select
            name="tipo_conexao_alimentacao_neutro"
            className="form-select"
            value={formData.tipo_conexao_alimentacao_neutro ?? ''}
            onChange={handleChange}
            disabled={!formData.possui_neutro}
          >
            <option value="">Selecione</option>
            <option value="BARRAMENTO">Barramento</option>
            <option value="BORNE">Borne</option>
            <option value="TOMADA">Tomada</option>
            <option value="DIRETO">Direto</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Conexão alimentação terra</label>
          <select
            name="tipo_conexao_alimentacao_terra"
            className="form-select"
            value={formData.tipo_conexao_alimentacao_terra ?? ''}
            onChange={handleChange}
            disabled={!formData.possui_terra}
          >
            <option value="">Selecione</option>
            <option value="BARRAMENTO">Barramento</option>
            <option value="BORNE">Borne</option>
            <option value="TOMADA">Tomada</option>
            <option value="DIRETO">Direto</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>

        <div className="col-12">
          <hr />
          <h2 className="h5">Recursos do painel</h2>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_plc"
              className="form-check-input"
              type="checkbox"
              name="possui_plc"
              checked={formData.possui_plc}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_plc">
              Possui PLC
            </label>
          </div>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_ihm"
              className="form-check-input"
              type="checkbox"
              name="possui_ihm"
              checked={formData.possui_ihm}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_ihm">
              Possui IHM
            </label>
          </div>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_switches"
              className="form-check-input"
              type="checkbox"
              name="possui_switches"
              checked={formData.possui_switches}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_switches">
              Possui switches
            </label>
          </div>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_climatizacao"
              className="form-check-input"
              type="checkbox"
              name="possui_climatizacao"
              checked={formData.possui_climatizacao}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_climatizacao">
              Possui climatização
            </label>
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label">Tipo de climatização</label>
          <select
            name="tipo_climatizacao"
            className="form-select"
            value={formData.tipo_climatizacao ?? ''}
            onChange={handleChange}
            disabled={!formData.possui_climatizacao}
          >
            <option value="">Selecione</option>
            <option value="VENTILADOR">Ventilador</option>
            <option value="EXAUSTOR">Exaustor</option>
            <option value="AR_CONDICIONADO">Ar condicionado</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>

        <div className="col-12">
          <hr />
          <h2 className="h5">Identificação e segurança</h2>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_plaqueta_identificacao"
              className="form-check-input"
              type="checkbox"
              name="possui_plaqueta_identificacao"
              checked={formData.possui_plaqueta_identificacao}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_plaqueta_identificacao">
              Plaqueta de identificação
            </label>
          </div>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_faixa_identificacao"
              className="form-check-input"
              type="checkbox"
              name="possui_faixa_identificacao"
              checked={formData.possui_faixa_identificacao}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_faixa_identificacao">
              Faixa de identificação
            </label>
          </div>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_adesivo_alerta"
              className="form-check-input"
              type="checkbox"
              name="possui_adesivo_alerta"
              checked={formData.possui_adesivo_alerta}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_adesivo_alerta">
              Adesivo de alerta
            </label>
          </div>
        </div>

        <div className="col-md-3">
          <div className="form-check">
            <input
              id="possui_adesivos_tensao"
              className="form-check-input"
              type="checkbox"
              name="possui_adesivos_tensao"
              checked={formData.possui_adesivos_tensao}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_adesivos_tensao">
              Adesivos de tensão
            </label>
          </div>
        </div>

        <div className="col-12">
          <hr />
          <h2 className="h5">Seccionamento</h2>
        </div>

        <div className="col-md-3">
          <div className="form-check mt-2">
            <input
              id="possui_seccionamento"
              className="form-check-input"
              type="checkbox"
              name="possui_seccionamento"
              checked={formData.possui_seccionamento}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="possui_seccionamento">
              Possui seccionamento
            </label>
          </div>
        </div>

        <div className="col-md-4">
          <label className="form-label">Tipo de seccionamento</label>
          <select
            name="tipo_seccionamento"
            className="form-select"
            value={formData.tipo_seccionamento ?? ''}
            onChange={handleChange}
            disabled={!formData.possui_seccionamento}
          >
            <option value="">Selecione</option>
            <option value="NENHUM">Sem seccionamento</option>
            <option value="SECCIONADORA">Seccionadora</option>
            <option value="DISJUNTOR_CAIXA_MOLDADA">Disjuntor caixa moldada</option>
          </select>
        </div>
      </div>

      <div className="mt-4 d-flex gap-2">
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar projeto'}
        </button>
      </div>
    </form>
  )
}