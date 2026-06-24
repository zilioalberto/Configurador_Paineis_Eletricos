import { type SyntheticEvent, useState } from 'react'
import { unidadeMedidaOptionsComValorAtual } from '../constants/catalogoChoiceOptions'
import type { ServicoFormData } from '../types/servico'

type ServicoFormProps = Readonly<{
  initialData: ServicoFormData
  onSubmit: (data: ServicoFormData) => void | Promise<void>
  loading?: boolean
  submitLabel?: string
}>

export default function ServicoForm({
  initialData,
  onSubmit,
  loading = false,
  submitLabel = 'Guardar serviço',
}: ServicoFormProps) {
  const [form, setForm] = useState(initialData)

  function patchField<K extends keyof ServicoFormData>(key: K, value: ServicoFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault()
    await onSubmit(form)
  }

  const unidadeOptions = unidadeMedidaOptionsComValorAtual(form.unidade_medida)

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="row g-3">
      <div className="col-md-4">
        <label className="form-label" htmlFor="servico-codigo">
          Código
        </label>
        <input
          id="servico-codigo"
          className="form-control"
          value={form.codigo}
          onChange={(e) => patchField('codigo', e.target.value)}
          required
          maxLength={60}
          disabled={loading}
        />
      </div>
      <div className="col-md-8">
        <label className="form-label" htmlFor="servico-descricao">
          Descrição
        </label>
        <input
          id="servico-descricao"
          className="form-control"
          value={form.descricao}
          onChange={(e) => patchField('descricao', e.target.value)}
          required
          maxLength={255}
          disabled={loading}
        />
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="servico-categoria">
          Categoria
        </label>
        <input
          id="servico-categoria"
          className="form-control"
          value={form.categoria}
          onChange={(e) => patchField('categoria', e.target.value)}
          maxLength={120}
          placeholder="Ex.: Montagem, Engenharia"
          disabled={loading}
        />
      </div>
      <div className="col-md-3">
        <label className="form-label" htmlFor="servico-unidade">
          Unidade
        </label>
        <select
          id="servico-unidade"
          className="form-select"
          value={form.unidade_medida}
          onChange={(e) => patchField('unidade_medida', e.target.value)}
          disabled={loading}
        >
          {unidadeOptions.map((o) => (
            <option key={o.value} value={o.value} title={o.title}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-3">
        <label className="form-label" htmlFor="servico-preco">
          Custo de referência
        </label>
        <input
          id="servico-preco"
          className="form-control"
          type="number"
          min="0"
          step="0.01"
          value={form.custo_referencia}
          onChange={(e) => patchField('custo_referencia', e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="servico-observacoes">
          Observações
        </label>
        <textarea
          id="servico-observacoes"
          className="form-control"
          rows={3}
          value={form.observacoes}
          onChange={(e) => patchField('observacoes', e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="col-12">
        <div className="form-check">
          <input
            id="servico-ativo"
            className="form-check-input"
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => patchField('ativo', e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="servico-ativo">
            Ativo no catálogo
          </label>
        </div>
      </div>
      <div className="col-12">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'A guardar…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
