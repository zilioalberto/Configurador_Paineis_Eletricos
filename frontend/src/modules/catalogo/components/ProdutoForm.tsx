import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useToast } from '@/components/feedback'
import { getEspecApiKey } from '../constants/categoriaEspecKey'
import { unidadeMedidaProdutoOptions } from '../constants/catalogoChoiceOptions'
import EspecificacaoCatalogoFields from './EspecificacaoCatalogoFields'
import type { CategoriaProduto } from '../types/categoria'
import type { CategoriaProdutoNome } from '../types/categoria'
import type { EspecificacaoFormState, ProdutoFormData } from '../types/produto'
import { applyCategoriaChange } from '../utils/produtoFormDefaults'

type ProdutoFormProps = {
  categorias: CategoriaProduto[]
  initialData: ProdutoFormData
  onSubmit: (data: ProdutoFormData) => Promise<void>
  loading?: boolean
  lockCategoria?: boolean
}

export default function ProdutoForm({
  categorias,
  initialData,
  onSubmit,
  loading = false,
  lockCategoria = false,
}: ProdutoFormProps) {
  const { showToast } = useToast()
  const [formData, setFormData] = useState<ProdutoFormData>(initialData)

  useEffect(() => {
    setFormData(initialData)
  }, [initialData])

  const categoriaNome = useMemo(() => {
    const c = categorias.find((x) => x.id === formData.categoria || x.nome === formData.categoria)
    return c?.nome as CategoriaProdutoNome | undefined
  }, [categorias, formData.categoria])

  const temBlocoEspecificacao = Boolean(categoriaNome && getEspecApiKey(categoriaNome))

  const handleBaseChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const t = e.target
      const { name, value, type } = t
      if (type === 'checkbox' && t instanceof HTMLInputElement) {
        setFormData((prev) => ({ ...prev, [name]: t.checked }))
        return
      }
      if (name === 'categoria') {
        setFormData((prev) => applyCategoriaChange(prev, value, categorias))
        return
      }
      setFormData((prev) => ({ ...prev, [name]: value }))
    },
    [categorias]
  )

  const patchEspecificacao = useCallback(
    (patch: Partial<EspecificacaoFormState>) => {
      setFormData((prev) => ({
        ...prev,
        especificacao: {
          ...(prev.especificacao ?? {}),
          ...patch,
        } as EspecificacaoFormState,
      }))
    },
    []
  )

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formData.categoria.trim()) return

    const esp = formData.especificacao

    if (categoriaNome === 'CONTATORA' && esp) {
      const ac3 = String(esp.corrente_ac3_a ?? '').trim()
      const ac1 = String(esp.corrente_ac1_a ?? '').trim()
      if (!ac3 && !ac1) {
        showToast({
          variant: 'warning',
          message: 'Informe corrente AC-3 ou AC-1 da contatora.',
        })
        return
      }
    }

    if (categoriaNome === 'SECCIONADORA' && esp) {
      const ac1 = String(esp.corrente_ac1_a ?? '').trim()
      const ac3 = String(esp.corrente_ac3_a ?? '').trim()
      if (!ac1 || !ac3) {
        showToast({
          variant: 'warning',
          message: 'Informe corrente AC-1 e AC-3 da seccionadora.',
        })
        return
      }
    }

    if (categoriaNome === 'DISJUNTOR_MOTOR' && esp) {
      const mn = String(esp.faixa_ajuste_min_a ?? '').trim()
      const mx = String(esp.faixa_ajuste_max_a ?? '').trim()
      if (!mn || !mx) {
        showToast({
          variant: 'warning',
          message: 'Informe faixa de ajuste mínima e máxima (A) do disjuntor motor.',
        })
        return
      }
    }

    await onSubmit(formData)
  }

  const espec = formData.especificacao ?? {}

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="row g-3">
      <div className="col-12">
        <h2 className="h6 text-muted mb-3">Classificação</h2>
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="produto-categoria">
          Categoria
        </label>
        <select
          id="produto-categoria"
          name="categoria"
          className="form-select"
          value={formData.categoria}
          onChange={handleBaseChange}
          required
          disabled={lockCategoria}
        >
          <option value="">Selecione…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_display ?? c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="col-12 mt-2">
        <h2 className="h6 text-muted mb-3">Dados principais</h2>
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor="produto-codigo">
          Código
        </label>
        <input
          id="produto-codigo"
          name="codigo"
          className="form-control"
          value={formData.codigo}
          onChange={handleBaseChange}
          required
          maxLength={60}
        />
      </div>
      <div className="col-md-8">
        <label className="form-label" htmlFor="produto-descricao">
          Descrição
        </label>
        <input
          id="produto-descricao"
          name="descricao"
          className="form-control"
          value={formData.descricao}
          onChange={handleBaseChange}
          required
          maxLength={255}
        />
      </div>

      <div className="col-md-4">
        <label className="form-label" htmlFor="produto-un">
          Unidade de medida
        </label>
        <select
          id="produto-un"
          name="unidade_medida"
          className="form-select"
          value={formData.unidade_medida}
          onChange={handleBaseChange}
        >
          {unidadeMedidaProdutoOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor="produto-valor">
          Valor unitário
        </label>
        <input
          id="produto-valor"
          name="valor_unitario"
          type="text"
          inputMode="decimal"
          className="form-control"
          value={formData.valor_unitario}
          onChange={handleBaseChange}
        />
      </div>
      <div className="col-md-4 d-flex align-items-end">
        <div className="form-check">
          <input
            id="produto-ativo"
            name="ativo"
            type="checkbox"
            className="form-check-input"
            checked={formData.ativo}
            onChange={handleBaseChange}
          />
          <label className="form-check-label" htmlFor="produto-ativo">
            Ativo
          </label>
        </div>
      </div>

      <div className="col-md-6">
        <label className="form-label" htmlFor="produto-fabricante">
          Fabricante
        </label>
        <input
          id="produto-fabricante"
          name="fabricante"
          className="form-control"
          value={formData.fabricante}
          onChange={handleBaseChange}
          maxLength={100}
        />
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="produto-ref-fab">
          Referência do fabricante
        </label>
        <input
          id="produto-ref-fab"
          name="referencia_fabricante"
          className="form-control"
          value={formData.referencia_fabricante}
          onChange={handleBaseChange}
          maxLength={120}
        />
      </div>

      <div className="col-md-4">
        <label className="form-label" htmlFor="produto-largura">
          Largura (mm)
        </label>
        <input
          id="produto-largura"
          name="largura_mm"
          type="text"
          inputMode="decimal"
          className="form-control"
          value={formData.largura_mm}
          onChange={handleBaseChange}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor="produto-altura">
          Altura (mm)
        </label>
        <input
          id="produto-altura"
          name="altura_mm"
          type="text"
          inputMode="decimal"
          className="form-control"
          value={formData.altura_mm}
          onChange={handleBaseChange}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor="produto-profundidade">
          Profundidade (mm)
        </label>
        <input
          id="produto-profundidade"
          name="profundidade_mm"
          type="text"
          inputMode="decimal"
          className="form-control"
          value={formData.profundidade_mm}
          onChange={handleBaseChange}
        />
      </div>

      <div className="col-12">
        <label className="form-label" htmlFor="produto-obs">
          Observações técnicas
        </label>
        <textarea
          id="produto-obs"
          name="observacoes_tecnicas"
          className="form-control"
          rows={3}
          value={formData.observacoes_tecnicas}
          onChange={handleBaseChange}
        />
      </div>

      {temBlocoEspecificacao && categoriaNome ? (
        <EspecificacaoCatalogoFields
          categoria={categoriaNome}
          value={espec}
          onPatch={patchEspecificacao}
        />
      ) : null}

      <div className="col-12 mt-3">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
