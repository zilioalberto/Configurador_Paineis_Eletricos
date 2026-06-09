import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { getEspecApiKey } from '../constants/categoriaEspecKey'
import {
  tipoBorneCatalogoOptions,
  unidadeMedidaOptionsComValorAtual,
} from '../constants/catalogoChoiceOptions'
import { useFornecedoresAtivosQuery } from '../hooks/useFornecedoresAtivosQuery'
import { listarProdutos } from '../services/produtoService'
import EspecificacaoCatalogoFields from './EspecificacaoCatalogoFields'
import type { CategoriaProduto } from '../types/categoria'
import type { CategoriaProdutoNome } from '../types/categoria'
import type { EspecificacaoFormState, ProdutoFormData, ProdutoListItem } from '../types/produto'
import { applyCategoriaChange } from '../utils/produtoFormDefaults'

type ProdutoFormProps = {
  categorias: CategoriaProduto[]
  initialData: ProdutoFormData
  onSubmit: (data: ProdutoFormData) => Promise<void>
  loading?: boolean
  lockCategoria?: boolean
}

function mensagemValidacaoEspecificacao(
  categoriaNome: CategoriaProdutoNome | undefined,
  esp: ProdutoFormData['especificacao'],
): string | null {
  if (categoriaNome === 'CONTATORA' && esp) {
    const ac3 = String(esp.corrente_ac3_a ?? '').trim()
    const ac1 = String(esp.corrente_ac1_a ?? '').trim()
    return !ac3 && !ac1 ? 'Informe corrente AC-3 ou AC-1 da contatora.' : null
  }
  if (categoriaNome === 'SECCIONADORA' && esp) {
    const ac1 = String(esp.corrente_ac1_a ?? '').trim()
    const ac3 = String(esp.corrente_ac3_a ?? '').trim()
    return !ac1 || !ac3 ? 'Informe corrente AC-1 e AC-3 da seccionadora.' : null
  }
  if (categoriaNome === 'DISJUNTOR_MOTOR' && esp) {
    const mn = String(esp.faixa_ajuste_min_a ?? '').trim()
    const mx = String(esp.faixa_ajuste_max_a ?? '').trim()
    return !mn || !mx
      ? 'Informe faixa de ajuste mínima e máxima (A) do disjuntor motor.'
      : null
  }
  return null
}

/** Formulário principal de produto (dados gerais + especificação). */
export default function ProdutoForm({
  categorias,
  initialData,
  onSubmit,
  loading = false,
  lockCategoria = false,
}: ProdutoFormProps) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [formData, setFormData] = useState<ProdutoFormData>(initialData)
  const [borneOptions, setBorneOptions] = useState<ProdutoListItem[]>([])

  const canVerCadastro = hasPermission(user, PERMISSION_KEYS.CADASTRO_VISUALIZAR)
  const { data: fornecedores = [], isFetching: loadingFornecedores } =
    useFornecedoresAtivosQuery(canVerCadastro)

  useEffect(() => {
    setFormData(initialData)
  }, [initialData])

  const categoriaNome = useMemo(() => {
    const c = categorias.find((x) => x.id === formData.categoria || x.nome === formData.categoria)
    return c?.nome as CategoriaProdutoNome | undefined
  }, [categorias, formData.categoria])

  const temBlocoEspecificacao = Boolean(categoriaNome && getEspecApiKey(categoriaNome))

  useEffect(() => {
    let alive = true
    if (categoriaNome !== 'BORNE') {
      setBorneOptions([])
      return
    }
    listarProdutos('BORNE', 1, 200)
      .then((page) => {
        if (alive) setBorneOptions(page.items)
      })
      .catch(() => {
        if (alive) setBorneOptions([])
      })
    return () => {
      alive = false
    }
  }, [categoriaNome])

  const opcoesUnidade = useMemo(
    () => unidadeMedidaOptionsComValorAtual(formData.unidade_medida),
    [formData.unidade_medida],
  )

  const opcoesParceiroComAtual = useCallback(
    (
      idRaw: string,
      nomeRaw: string,
      documentoRaw: string,
      nomeFallback = '',
    ) => {
      const id = idRaw.trim()
      if (!id) return fornecedores
      if (fornecedores.some((x) => x.id === id)) return fornecedores
      return [
        ...fornecedores,
        {
          id,
          razao_social: nomeRaw.trim() || nomeFallback.trim() || id,
          documento: documentoRaw.trim(),
        },
      ]
    },
    [fornecedores],
  )

  const opcoesFabricanteParceiro = useMemo(() => {
    return opcoesParceiroComAtual(
      formData.fabricante_parceiro,
      formData.fabricante_parceiro_nome,
      formData.fabricante_parceiro_documento,
      formData.fabricante,
    )
  }, [
    opcoesParceiroComAtual,
    formData.fabricante_parceiro,
    formData.fabricante,
    formData.fabricante_parceiro_nome,
    formData.fabricante_parceiro_documento,
  ])

  const opcoesFornecedorParceiro = useMemo(() => {
    return opcoesParceiroComAtual(
      formData.fornecedor_parceiro,
      formData.fornecedor_parceiro_nome,
      formData.fornecedor_parceiro_documento,
    )
  }, [
    opcoesParceiroComAtual,
    formData.fornecedor_parceiro,
    formData.fornecedor_parceiro_nome,
    formData.fornecedor_parceiro_documento,
  ])

  const selecionarParceiro = useCallback(
    (id: string, opcoes: typeof fornecedores) => opcoes.find((x) => x.id === id),
    [],
  )

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
    [categorias],
  )

  const onFabricanteParceiroChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value.trim()
      if (!id) {
        setFormData((prev) => ({
          ...prev,
          fabricante_parceiro: '',
          fabricante_parceiro_nome: '',
          fabricante_parceiro_documento: '',
        }))
        return
      }
      const f = selecionarParceiro(id, opcoesFabricanteParceiro)
      const nome = (f?.razao_social ?? '').trim()
      setFormData((prev) => ({
        ...prev,
        fabricante_parceiro: id,
        fabricante_parceiro_nome: nome,
        fabricante_parceiro_documento: f?.documento ?? '',
        fabricante: nome,
      }))
    },
    [opcoesFabricanteParceiro, selecionarParceiro],
  )

  const onFornecedorParceiroChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value.trim()
      if (!id) {
        setFormData((prev) => ({
          ...prev,
          fornecedor_parceiro: '',
          fornecedor_parceiro_nome: '',
          fornecedor_parceiro_documento: '',
        }))
        return
      }
      const f = selecionarParceiro(id, opcoesFornecedorParceiro)
      const nome = (f?.razao_social ?? '').trim()
      setFormData((prev) => ({
        ...prev,
        fornecedor_parceiro: id,
        fornecedor_parceiro_nome: nome,
        fornecedor_parceiro_documento: f?.documento ?? '',
      }))
    },
    [opcoesFornecedorParceiro, selecionarParceiro],
  )

  const patchEspecificacao = useCallback((patch: Partial<EspecificacaoFormState>) => {
    setFormData((prev) => ({
      ...prev,
      especificacao: {
        ...(prev.especificacao ?? {}),
        ...patch,
      } as EspecificacaoFormState,
    }))
  }, [])

  const patchAcessorioCompativel = useCallback(
    (
      index: number,
      patch: Partial<ProdutoFormData['acessorios_compativeis'][number]>,
    ) => {
      setFormData((prev) => ({
        ...prev,
        acessorios_compativeis: prev.acessorios_compativeis.map((row, i) =>
          i === index ? { ...row, ...patch } : row,
        ),
      }))
    },
    [],
  )

  const adicionarAcessorioCompativel = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      acessorios_compativeis: [
        ...prev.acessorios_compativeis,
        {
          acessorio: '',
          tipo_acessorio: 'TAMPA',
          quantidade_padrao: '1.00',
          prioridade: prev.acessorios_compativeis.length,
          observacoes: '',
        },
      ],
    }))
  }, [])

  const removerAcessorioCompativel = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      acessorios_compativeis: prev.acessorios_compativeis.filter((_, i) => i !== index),
    }))
  }, [])

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formData.categoria.trim()) return

    const mensagem = mensagemValidacaoEspecificacao(categoriaNome, formData.especificacao)
    if (mensagem) {
      showToast({ variant: 'warning', message: mensagem })
      return
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

      <div className="col-md-3">
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
          {opcoesUnidade.map((o) => (
            <option key={o.value} value={o.value} title={o.title}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-3">
        <label className="form-label" htmlFor="produto-preco-base">
          Preço base
        </label>
        <div className="input-group">
          <span className="input-group-text">R$</span>
          <input
            id="produto-preco-base"
            name="preco_base"
            type="text"
            inputMode="decimal"
            className="form-control"
            value={formData.preco_base}
            onChange={handleBaseChange}
            aria-label="Preço base em reais"
          />
        </div>
      </div>
      <div className="col-md-3">
        <label className="form-label" htmlFor="produto-aliquota-ipi">
          Alíquota IPI (%)
        </label>
        <input
          id="produto-aliquota-ipi"
          name="aliquota_ipi"
          type="text"
          inputMode="decimal"
          className="form-control"
          value={formData.aliquota_ipi}
          onChange={handleBaseChange}
          placeholder="Opcional"
          aria-describedby="produto-aliquota-ipi-hint"
        />
        <div id="produto-aliquota-ipi-hint" className="form-text">
          Gravada como <code>p_ipi</code> no primeiro item fiscal do produto (ordem).
        </div>
      </div>
      <div className="col-md-3 d-flex align-items-end">
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
        <label className="form-label" htmlFor="produto-fabricante-parceiro">
          Fabricante (cadastro)
        </label>
        <select
          id="produto-fabricante-parceiro"
          className="form-select"
          value={formData.fabricante_parceiro}
          onChange={onFabricanteParceiroChange}
          disabled={!canVerCadastro || loadingFornecedores}
        >
          <option value="">(em branco)</option>
          {opcoesFabricanteParceiro.map((p) => (
            <option key={p.id} value={p.id}>
              {p.razao_social}
              {p.documento ? ` — ${p.documento}` : ''}
            </option>
          ))}
        </select>
        {!canVerCadastro ? (
          <p className="form-text small text-muted mb-0">
            É necessária a permissão de visualizar cadastros para listar fornecedores/fabricantes. Sem
            ela, o vínculo atual é exibido, mas não pode ser alterado por aqui.
          </p>
        ) : null}
        {formData.fabricante_parceiro.trim() && formData.fabricante_parceiro_nome.trim() ? (
          <p className="form-text small text-muted mb-0">
            Fabricante vinculado:{' '}
            <strong>
              {formData.fabricante_parceiro_nome}
              {formData.fabricante_parceiro_documento
                ? ` — ${formData.fabricante_parceiro_documento}`
                : ''}
            </strong>
          </p>
        ) : null}
        {formData.fabricante.trim() && !formData.fabricante_parceiro.trim() ? (
          <p className="form-text small text-muted mb-0">
            Fabricante em texto (sem vínculo): <strong>{formData.fabricante}</strong>. Selecione um
            fornecedor acima para padronizar pelo cadastro.
          </p>
        ) : null}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="produto-fornecedor-parceiro">
          Fornecedor (cadastro)
        </label>
        <select
          id="produto-fornecedor-parceiro"
          className="form-select"
          value={formData.fornecedor_parceiro}
          onChange={onFornecedorParceiroChange}
          disabled={!canVerCadastro || loadingFornecedores}
        >
          <option value="">(em branco)</option>
          {opcoesFornecedorParceiro.map((p) => (
            <option key={p.id} value={p.id}>
              {p.razao_social}
              {p.documento ? ` — ${p.documento}` : ''}
            </option>
          ))}
        </select>
        {formData.fornecedor_parceiro.trim() && formData.fornecedor_parceiro_nome.trim() ? (
          <p className="form-text small text-muted mb-0">
            Fornecedor vinculado:{' '}
            <strong>
              {formData.fornecedor_parceiro_nome}
              {formData.fornecedor_parceiro_documento
                ? ` — ${formData.fornecedor_parceiro_documento}`
                : ''}
            </strong>
          </p>
        ) : null}
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
          placeholder="Se vazio, será usado o código do produto ao salvar"
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

      {categoriaNome === 'BORNE' ? (
        <>
          <div className="col-12 mt-3">
            <div className="d-flex justify-content-between align-items-center gap-2">
              <h2 className="h6 text-muted mb-0">Acessórios compatíveis</h2>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={adicionarAcessorioCompativel}
              >
                Adicionar
              </button>
            </div>
          </div>
          {formData.acessorios_compativeis.map((row, index) => (
            <div key={index} className="col-12">
              <div className="row g-2 align-items-end">
                <div className="col-md-5">
                  <label className="form-label" htmlFor={`acessorio-produto-${index}`}>
                    Produto acessório
                  </label>
                  <select
                    id={`acessorio-produto-${index}`}
                    className="form-select"
                    value={row.acessorio}
                    onChange={(e) => patchAcessorioCompativel(index, { acessorio: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {row.acessorio &&
                    !borneOptions.some((p) => p.id === row.acessorio) ? (
                      <option value={row.acessorio}>
                        {row.acessorio_codigo || row.acessorio} —{' '}
                        {row.acessorio_descricao || 'Acessório vinculado'}
                      </option>
                    ) : null}
                    {borneOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.descricao}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor={`acessorio-tipo-${index}`}>
                    Tipo
                  </label>
                  <select
                    id={`acessorio-tipo-${index}`}
                    className="form-select"
                    value={row.tipo_acessorio}
                    onChange={(e) =>
                      patchAcessorioCompativel(index, { tipo_acessorio: e.target.value })
                    }
                  >
                    {tipoBorneCatalogoOptions
                      .filter((opt) => opt.value === 'TAMPA' || opt.value === 'JUMPER')
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor={`acessorio-qtd-${index}`}>
                    Quantidade
                  </label>
                  <input
                    id={`acessorio-qtd-${index}`}
                    className="form-control"
                    inputMode="decimal"
                    value={row.quantidade_padrao}
                    onChange={(e) =>
                      patchAcessorioCompativel(index, { quantidade_padrao: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor={`acessorio-prioridade-${index}`}>
                    Prioridade
                  </label>
                  <input
                    id={`acessorio-prioridade-${index}`}
                    className="form-control"
                    type="number"
                    value={row.prioridade}
                    onChange={(e) =>
                      patchAcessorioCompativel(index, {
                        prioridade: Number.parseInt(e.target.value || '0', 10),
                      })
                    }
                  />
                </div>
                <div className="col-md-1">
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100"
                    onClick={() => removerAcessorioCompativel(index)}
                    aria-label="Remover acessório compatível"
                  >
                    ×
                  </button>
                </div>
                <div className="col-12">
                  <input
                    className="form-control"
                    value={row.observacoes}
                    onChange={(e) =>
                      patchAcessorioCompativel(index, { observacoes: e.target.value })
                    }
                    placeholder="Observações"
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : null}

      <div className="col-12 mt-3">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
