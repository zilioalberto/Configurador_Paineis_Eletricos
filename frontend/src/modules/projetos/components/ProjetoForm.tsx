import { useEffect, useState } from 'react'
import type {
  ProjetoFormData,
  StatusProjeto,
  TipoClimatizacaoPainel,
  TipoConexaoAlimentacao,
  TipoCorrente,
  TipoPainel,
  TipoSeccionamento,
} from '../types/projeto'

type ProjetoFormProps = {
  onSubmit: (data: ProjetoFormData) => Promise<void>
  loading?: boolean
  initialData?: ProjetoFormData
}

type Option<T extends string | number> = {
  value: T
  label: string
}

const statusOptions: Option<StatusProjeto>[] = [
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'FINALIZADO', label: 'Finalizado' },
]

const tipoPainelOptions: Option<TipoPainel>[] = [
  { value: 'AUTOMACAO', label: 'Automação' },
  { value: 'DISTRIBUICAO', label: 'Distribuição' },
]

const tipoCorrenteOptions: Option<TipoCorrente>[] = [
  { value: 'CA', label: 'Corrente alternada (CA)' },
  { value: 'CC', label: 'Corrente contínua (CC)' },
]

const numeroFasesOptions: Option<number>[] = [
  { value: 1, label: 'Monofásico' },
  { value: 2, label: 'Bifásico' },
  { value: 3, label: 'Trifásico' },
]

const frequenciaOptions: Option<number>[] = [
  { value: 50, label: '50 Hz' },
  { value: 60, label: '60 Hz' },
]

const tipoConexaoOptions: Option<TipoConexaoAlimentacao>[] = [
  { value: 'BARRAMENTO', label: 'Barramento' },
  { value: 'BORNE', label: 'Borne' },
  { value: 'TOMADA', label: 'Tomada' },
  { value: 'DIRETO', label: 'Direto' },
  { value: 'OUTRO', label: 'Outro' },
]

const tipoClimatizacaoOptions: Option<TipoClimatizacaoPainel>[] = [
  { value: 'VENTILADOR', label: 'Ventilador' },
  { value: 'EXAUSTOR', label: 'Exaustor' },
  { value: 'AR_CONDICIONADO', label: 'Ar-condicionado' },
  { value: 'OUTRO', label: 'Outro' },
]

const tipoSeccionamentoOptions: Option<TipoSeccionamento>[] = [
  { value: 'NENHUM', label: 'Sem seccionamento' },
  { value: 'SECCIONADORA', label: 'Seccionadora' },
  { value: 'DISJUNTOR_CAIXA_MOLDADA', label: 'Disjuntor caixa moldada' },
]

const initialState: ProjetoFormData = {
  codigo: '',
  nome: '',
  descricao: '',
  cliente: '',

  status: 'EM_ANDAMENTO',
  tipo_painel: 'AUTOMACAO',

  tipo_corrente: 'CA',
  tensao_nominal: 380,
  numero_fases: 3,
  frequencia: 60,

  possui_neutro: true,
  possui_terra: true,

  tipo_conexao_alimentacao_potencia: 'BORNE',
  tipo_conexao_alimentacao_neutro: 'BORNE',
  tipo_conexao_alimentacao_terra: 'BORNE',

  tipo_corrente_comando: 'CC',
  tensao_comando: 24,

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

function renderOptions<T extends string | number>(options: Option<T>[]) {
  return options.map((option) => (
    <option key={String(option.value)} value={option.value}>
      {option.label}
    </option>
  ))
}

export default function ProjetoForm({
  onSubmit,
  loading = false,
  initialData,
}: ProjetoFormProps) {
  const [formData, setFormData] = useState<ProjetoFormData>(initialData ?? initialState)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

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
            {renderOptions(statusOptions)}
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
            {renderOptions(tipoPainelOptions)}
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
            {renderOptions(tipoCorrenteOptions)}
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
                {renderOptions(numeroFasesOptions)}
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
                {renderOptions(frequenciaOptions)}
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
            {renderOptions(tipoCorrenteOptions)}
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
            {renderOptions(tipoConexaoOptions)}
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
            {renderOptions(tipoConexaoOptions)}
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
            {renderOptions(tipoConexaoOptions)}
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
            {renderOptions(tipoClimatizacaoOptions)}
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
            {renderOptions(tipoSeccionamentoOptions)}
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