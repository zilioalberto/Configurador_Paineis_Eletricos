import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useToast } from '@/components/feedback'
import {
  corManoplaOptions,
  modoMontagemOptions,
  tensaoBobinaOptions,
  tipoCorrenteBobinaOptions,
  tipoFixacaoSeccionadoraOptions,
  unidadeMedidaProdutoOptions,
} from '../constants/catalogoChoiceOptions'
import type { CategoriaProduto } from '../types/categoria'
import type { ProdutoFormData } from '../types/produto'
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
    const c = categorias.find((x) => x.id === formData.categoria)
    return c?.nome
  }, [categorias, formData.categoria])

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

  const patchContatora = useCallback(
    (patch: Partial<NonNullable<ProdutoFormData['especificacao_contatora']>>) => {
      setFormData((prev) =>
        prev.especificacao_contatora
          ? { ...prev, especificacao_contatora: { ...prev.especificacao_contatora, ...patch } }
          : prev
      )
    },
    []
  )

  const patchDisjuntor = useCallback(
    (patch: Partial<NonNullable<ProdutoFormData['especificacao_disjuntor_motor']>>) => {
      setFormData((prev) =>
        prev.especificacao_disjuntor_motor
          ? {
              ...prev,
              especificacao_disjuntor_motor: {
                ...prev.especificacao_disjuntor_motor,
                ...patch,
              },
            }
          : prev
      )
    },
    []
  )

  const patchSeccionadora = useCallback(
    (patch: Partial<NonNullable<ProdutoFormData['especificacao_seccionadora']>>) => {
      setFormData((prev) =>
        prev.especificacao_seccionadora
          ? {
              ...prev,
              especificacao_seccionadora: {
                ...prev.especificacao_seccionadora,
                ...patch,
              },
            }
          : prev
      )
    },
    []
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!formData.categoria.trim()) return
    if (categoriaNome === 'CONTATORA' && formData.especificacao_contatora) {
      const s = formData.especificacao_contatora
      if (!s.corrente_ac3_a.trim() && !s.corrente_ac1_a.trim()) {
        showToast({
          variant: 'warning',
          message: 'Informe corrente AC-3 ou AC-1 da contatora.',
        })
        return
      }
    }
    await onSubmit(formData)
  }

  const specContatora = formData.especificacao_contatora
  const specDisjuntor = formData.especificacao_disjuntor_motor
  const specSeccionadora = formData.especificacao_seccionadora

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

      {categoriaNome === 'CONTATORA' && specContatora && (
        <>
          <div className="col-12 mt-3">
            <h2 className="h6 text-muted mb-2">Especificação — contatora</h2>
            <p className="small text-muted mb-0">
              Informe pelo menos uma corrente (AC-3 ou AC-1).
            </p>
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="ct-ac3">
              Corrente AC-3 (A)
            </label>
            <input
              id="ct-ac3"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={specContatora.corrente_ac3_a}
              onChange={(e) => patchContatora({ corrente_ac3_a: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="ct-ac1">
              Corrente AC-1 (A)
            </label>
            <input
              id="ct-ac1"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={specContatora.corrente_ac1_a}
              onChange={(e) => patchContatora({ corrente_ac1_a: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="ct-tensao-bobina">
              Tensão da bobina
            </label>
            <select
              id="ct-tensao-bobina"
              className="form-select"
              value={specContatora.tensao_bobina_v}
              onChange={(e) =>
                patchContatora({ tensao_bobina_v: Number(e.target.value) })
              }
            >
              {tensaoBobinaOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="ct-tipo-bobina">
              Tipo de corrente da bobina
            </label>
            <select
              id="ct-tipo-bobina"
              className="form-select"
              value={specContatora.tipo_corrente_bobina}
              onChange={(e) =>
                patchContatora({
                  tipo_corrente_bobina: e.target.value as 'CA' | 'CC',
                })
              }
            >
              {tipoCorrenteBobinaOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="ct-na">
              Contatos aux. NA
            </label>
            <input
              id="ct-na"
              type="number"
              min={0}
              className="form-control"
              value={specContatora.contatos_aux_na}
              onChange={(e) =>
                patchContatora({ contatos_aux_na: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="ct-nf">
              Contatos aux. NF
            </label>
            <input
              id="ct-nf"
              type="number"
              min={0}
              className="form-control"
              value={specContatora.contatos_aux_nf}
              onChange={(e) =>
                patchContatora({ contatos_aux_nf: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="ct-modo">
              Modo de montagem
            </label>
            <select
              id="ct-modo"
              className="form-select"
              value={specContatora.modo_montagem}
              onChange={(e) => patchContatora({ modo_montagem: e.target.value })}
            >
              {modoMontagemOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {categoriaNome === 'DISJUNTOR_MOTOR' && specDisjuntor && (
        <>
          <div className="col-12 mt-3">
            <h2 className="h6 text-muted mb-2">Especificação — disjuntor motor</h2>
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="dm-min">
              Faixa ajuste mín. (A)
            </label>
            <input
              id="dm-min"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={specDisjuntor.faixa_ajuste_min_a}
              onChange={(e) => patchDisjuntor({ faixa_ajuste_min_a: e.target.value })}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="dm-max">
              Faixa ajuste máx. (A)
            </label>
            <input
              id="dm-max"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={specDisjuntor.faixa_ajuste_max_a}
              onChange={(e) => patchDisjuntor({ faixa_ajuste_max_a: e.target.value })}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="dm-na">
              Contatos aux. NA
            </label>
            <input
              id="dm-na"
              type="number"
              min={0}
              className="form-control"
              value={specDisjuntor.contatos_aux_na}
              onChange={(e) =>
                patchDisjuntor({ contatos_aux_na: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="dm-nf">
              Contatos aux. NF
            </label>
            <input
              id="dm-nf"
              type="number"
              min={0}
              className="form-control"
              value={specDisjuntor.contatos_aux_nf}
              onChange={(e) =>
                patchDisjuntor({ contatos_aux_nf: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="dm-modo">
              Modo de montagem
            </label>
            <select
              id="dm-modo"
              className="form-select"
              value={specDisjuntor.modo_montagem}
              onChange={(e) => patchDisjuntor({ modo_montagem: e.target.value })}
            >
              {modoMontagemOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {categoriaNome === 'SECCIONADORA' && specSeccionadora && (
        <>
          <div className="col-12 mt-3">
            <h2 className="h6 text-muted mb-2">Especificação — seccionadora</h2>
            <p className="small text-muted mb-0">
              Informe corrente AC-1 e AC-3 conforme placa do equipamento.
            </p>
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="sc-ac1">
              Corrente AC-1 (A)
            </label>
            <input
              id="sc-ac1"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={specSeccionadora.corrente_ac1_a}
              onChange={(e) => patchSeccionadora({ corrente_ac1_a: e.target.value })}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="sc-ac3">
              Corrente AC-3 (A)
            </label>
            <input
              id="sc-ac3"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={specSeccionadora.corrente_ac3_a}
              onChange={(e) => patchSeccionadora({ corrente_ac3_a: e.target.value })}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="sc-tipo-mont">
              Tipo de montagem
            </label>
            <select
              id="sc-tipo-mont"
              className="form-select"
              value={specSeccionadora.tipo_montagem}
              onChange={(e) => patchSeccionadora({ tipo_montagem: e.target.value })}
            >
              {modoMontagemOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="sc-fix">
              Tipo de fixação
            </label>
            <select
              id="sc-fix"
              className="form-select"
              value={specSeccionadora.tipo_fixacao}
              onChange={(e) => patchSeccionadora({ tipo_fixacao: e.target.value })}
            >
              {tipoFixacaoSeccionadoraOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="sc-cor">
              Cor da manopla
            </label>
            <select
              id="sc-cor"
              className="form-select"
              value={specSeccionadora.cor_manopla}
              onChange={(e) => patchSeccionadora({ cor_manopla: e.target.value })}
            >
              {corManoplaOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="col-12 mt-3">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
