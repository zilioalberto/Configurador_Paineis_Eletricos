import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useCategoriaListQuery } from '@/modules/catalogo/hooks/useCategoriaListQuery'
import { listarFornecedoresNfe } from '@/modules/catalogo/services/nfeImportService'
import type {
  NfeFornecedorOption,
  NfeItemPreview,
  NfeProdutoExistenteResumo,
} from '@/modules/catalogo/types/nfeImport'
import {
  buildNfeCamposComparacao,
  nfeItemLinhaDivergeDoCatalogo,
} from '@/modules/catalogo/utils/nfeImportCompare'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { labelObjetivoEntrada } from '../constants/objetivoEntradaOptions'
import {
  importarCatalogoNfe,
  previewCatalogoNfe,
  vincularProdutoItemNfe,
} from '../services/fiscalNfeService'
import type {
  ImportarCatalogoItemPayload,
  ImportarCatalogoResponse,
  PreviewCatalogoItem,
  ProdutoMatch,
} from '../types/documentoFiscalRecebido'

type SelecaoItem = {
  importar: boolean
  codigo: string
  categoria: string
  atualizar_se_existir: boolean
}

const PARCEIRO_EMITENTE = 'emitente'
const PARCEIRO_NENHUM = 'nenhum'
const PREFIXO_PARCEIRO = 'parceiro:'

type ParceiroSelecao =
  | typeof PARCEIRO_EMITENTE
  | typeof PARCEIRO_NENHUM
  | `${typeof PREFIXO_PARCEIRO}${string}`

function payloadFornecedor(sel: ParceiroSelecao) {
  if (sel === PARCEIRO_EMITENTE) return { criar_fornecedor: true }
  if (sel === PARCEIRO_NENHUM) return { criar_fornecedor: false }
  return { criar_fornecedor: false, fornecedor_id: sel.slice(PREFIXO_PARCEIRO.length) }
}

function payloadFabricante(sel: ParceiroSelecao) {
  if (sel === PARCEIRO_EMITENTE) return { criar_fabricante: true }
  if (sel === PARCEIRO_NENHUM) return { criar_fabricante: false }
  return { criar_fabricante: false, fabricante_id: sel.slice(PREFIXO_PARCEIRO.length) }
}

const BADGE_METODO: Record<ProdutoMatch['metodo'], { rotulo: string; cor: string }> = {
  GTIN: { rotulo: 'GTIN', cor: 'success' },
  DEPARA: { rotulo: 'De-para', cor: 'success' },
  CODIGO: { rotulo: 'Código igual', cor: 'primary' },
  SIMILARIDADE: { rotulo: 'Possível duplicado', cor: 'warning' },
  NENHUM: { rotulo: 'Novo produto', cor: 'secondary' },
}

function selecaoPadrao(item: PreviewCatalogoItem): SelecaoItem {
  return {
    importar: item.item_vinculado_produto_id == null,
    codigo: item.c_prod,
    categoria: item.produto_existente?.categoria ?? '',
    atualizar_se_existir: false,
  }
}

function MatchSituacao({
  item,
  vincularPendente,
  onVincular,
}: Readonly<{
  item: PreviewCatalogoItem
  vincularPendente: boolean
  onVincular: (item: PreviewCatalogoItem, produtoId: string) => void
}>) {
  if (item.item_vinculado_produto_id) {
    return (
      <span className="badge bg-success" title="Item já vinculado a um produto do catálogo">
        Já vinculado{item.match.produto_codigo ? ` (${item.match.produto_codigo})` : ''}
      </span>
    )
  }

  const meta = BADGE_METODO[item.match.metodo]

  if (item.match.metodo === 'SIMILARIDADE') {
    return (
      <div className="d-grid gap-2">
        <span className="badge bg-warning text-dark align-self-start">{meta.rotulo}</span>
        <ul className="list-unstyled small mb-0">
          {item.match.sugestoes.map((sug) => (
            <li key={sug.produto_id} className="mb-2 border-start border-2 ps-2">
              <div className="fw-semibold">
                {sug.codigo} — {sug.descricao}
              </div>
              <div className="text-muted">
                {Math.round(sug.score * 100)}% · {sug.motivos.join(', ') || 'similar'}
              </div>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm mt-1"
                disabled={vincularPendente || item.item_documento_id == null}
                onClick={() => onVincular(item, sug.produto_id)}
              >
                É o mesmo: vincular
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (item.match.produto_codigo) {
    return (
      <span className={`badge bg-${meta.cor}`} title={`Correspondência por ${meta.rotulo}`}>
        {meta.rotulo}: {item.match.produto_codigo}
      </span>
    )
  }

  return <span className={`badge bg-${meta.cor}`}>{meta.rotulo}</span>
}

function ComparacaoDivergencia({
  item,
  categoria,
  categoriaLabel,
}: Readonly<{
  item: PreviewCatalogoItem
  categoria: string
  categoriaLabel: string
}>) {
  const existente = item.produto_existente
  if (!existente) return null
  const linhas = buildNfeCamposComparacao(
    item as unknown as NfeItemPreview,
    categoria,
    categoriaLabel,
    existente as unknown as NfeProdutoExistenteResumo,
  )
  return (
    <div className="px-3 py-2 border-top bg-white small">
      <strong className="d-block mb-2">NF-e × catálogo (código {existente.codigo})</strong>
      <div className="table-responsive">
        <table className="table table-sm table-bordered mb-0">
          <thead className="table-light">
            <tr>
              <th>Campo</th>
              <th>Valor na NF-e / seleção</th>
              <th>Valor no catálogo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((row) => (
              <tr key={row.id} className={row.diverge ? 'table-warning' : ''}>
                <td>{row.label}</td>
                <td>{row.xml || '—'}</td>
                <td>{row.catalogo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultadoImportacao({
  resultado,
}: Readonly<{ resultado: ImportarCatalogoResponse | null }>) {
  if (!resultado) return null
  return (
    <div className="mt-4 border-top pt-3">
      <h3 className="h6">Resultado da última importação</h3>
      <ul className="small mb-2">
        <li>{resultado.itens_vinculados} item(ns) vinculado(s) ao catálogo (rastreabilidade).</li>
        {resultado.produtos_criados.length ? (
          <li>
            Produtos criados ({resultado.produtos_criados.length}):{' '}
            <code>{resultado.produtos_criados.join(', ')}</code>
          </li>
        ) : null}
        {resultado.produtos_atualizados.length ? (
          <li>
            Produtos atualizados ({resultado.produtos_atualizados.length}):{' '}
            <code>{resultado.produtos_atualizados.join(', ')}</code>
          </li>
        ) : null}
        {resultado.fornecedores_associados.length ? (
          <li>
            Fornecedor de-para registrado:{' '}
            {resultado.fornecedores_associados.map((f) => f.razao_social).join(', ')}
          </li>
        ) : null}
      </ul>
      {resultado.avisos.length ? (
        <div className="alert alert-warning py-2 small mb-2">
          <strong>Avisos</strong>
          <ul className="mb-0 mt-1">
            {resultado.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {resultado.produtos_ignorados.length ? (
        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0">
            <caption className="small text-muted">Linhas não importadas</caption>
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {resultado.produtos_ignorados.map((row, idx) => (
                <tr key={`${row.n_item ?? idx}-${idx}`}>
                  <td>{row.n_item ?? '—'}</td>
                  <td>{row.codigo ?? '—'}</td>
                  <td>{row.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

/** Revisão de importação de uma NF-e recebida para o catálogo (matching em cascata + de-para). */
export default function NfeImportarCatalogoPage() {
  const { id: idParam } = useParams()
  const documentoId = Number(idParam)
  const validId = Number.isFinite(documentoId) && documentoId > 0
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const { data: categorias = [], isPending: catPending } = useCategoriaListQuery()
  const [selecoes, setSelecoes] = useState<Record<number, SelecaoItem>>({})
  const [detalheAberto, setDetalheAberto] = useState<Record<number, boolean>>({})
  const [categoriaPadrao, setCategoriaPadrao] = useState('')
  const [fornecedores, setFornecedores] = useState<NfeFornecedorOption[]>([])
  const [fornecedorSel, setFornecedorSel] = useState<ParceiroSelecao>(PARCEIRO_EMITENTE)
  const [fornecedorEhFabricante, setFornecedorEhFabricante] = useState(true)
  const [fabricanteSel, setFabricanteSel] = useState<ParceiroSelecao>(PARCEIRO_NENHUM)
  const [resultado, setResultado] = useState<ImportarCatalogoResponse | null>(null)

  const previewQuery = useQuery({
    queryKey: fiscalQueryKeys.nfePreviewCatalogo(documentoId),
    queryFn: () => previewCatalogoNfe(documentoId),
    enabled: validId,
  })

  const itens = useMemo(
    () => previewQuery.data?.snapshot.itens ?? [],
    [previewQuery.data],
  )

  const emitenteFornecedorDisponivel =
    previewQuery.data?.snapshot.emitente?.cadastro_fornecedor_disponivel ?? false

  useEffect(() => {
    let ativo = true
    listarFornecedoresNfe()
      .then((dados) => {
        if (ativo) setFornecedores(dados)
      })
      .catch(() => {
        if (ativo) {
          showToast({
            variant: 'warning',
            title: 'Fornecedores',
            message: 'Não foi possível carregar a lista de parceiros cadastrados.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [showToast])

  useEffect(() => {
    if (!previewQuery.data) return
    const next: Record<number, SelecaoItem> = {}
    for (const item of previewQuery.data.snapshot.itens) {
      next[item.n_item] = selecaoPadrao(item)
    }
    setSelecoes(next)
    setFornecedorSel(
      previewQuery.data.snapshot.emitente?.cadastro_fornecedor_disponivel
        ? PARCEIRO_EMITENTE
        : PARCEIRO_NENHUM,
    )
  }, [previewQuery.data])

  const categoriaLabel = useCallback(
    (cid: string) =>
      categorias.find((c) => c.id === cid)?.nome_display ??
      categorias.find((c) => c.id === cid)?.nome ??
      cid,
    [categorias],
  )

  const vincularMutation = useMutation({
    mutationFn: ({ itemId, produtoId }: { itemId: number; produtoId: string }) =>
      vincularProdutoItemNfe(itemId, produtoId, true),
    onSuccess: (res) => {
      showToast({
        variant: 'success',
        title: 'Produto vinculado',
        message: `Item associado ao produto ${res.produto_codigo} e de-para registrado.`,
      })
      void queryClient.invalidateQueries({
        queryKey: fiscalQueryKeys.nfePreviewCatalogo(documentoId),
      })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'Vínculo',
        message: extrairMensagemErroApi(err) || 'Não foi possível vincular o produto.',
      })
    },
  })

  const importarMutation = useMutation({
    mutationFn: (itensPayload: ImportarCatalogoItemPayload[]) =>
      importarCatalogoNfe(documentoId, {
        categoria_padrao: categoriaPadrao || undefined,
        itens: itensPayload,
      }),
    onSuccess: (res) => {
      setResultado(res)
      showToast({
        variant: 'success',
        title: 'Importação concluída',
        message: `${res.itens_vinculados} item(ns) vinculado(s) ao catálogo.`,
      })
      void queryClient.invalidateQueries({
        queryKey: fiscalQueryKeys.nfePreviewCatalogo(documentoId),
      })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'Importação',
        message: extrairMensagemErroApi(err) || 'Falha ao importar para o catálogo.',
      })
    },
  })

  const alterarSelecao = useCallback((nItem: number, patch: Partial<SelecaoItem>) => {
    setSelecoes((prev) => ({ ...prev, [nItem]: { ...prev[nItem], ...patch } }))
  }, [])

  const aplicarCategoriaPadrao = useCallback(() => {
    if (!categoriaPadrao) {
      showToast({ variant: 'warning', message: 'Selecione uma categoria para aplicar.' })
      return
    }
    setSelecoes((prev) => {
      const next = { ...prev }
      for (const item of itens) {
        const atual = next[item.n_item]
        if (atual?.importar && !atual.categoria) {
          next[item.n_item] = { ...atual, categoria: categoriaPadrao }
        }
      }
      return next
    })
  }, [categoriaPadrao, itens, showToast])

  const handleVincular = useCallback(
    (item: PreviewCatalogoItem, produtoId: string) => {
      if (item.item_documento_id == null) return
      vincularMutation.mutate({ itemId: item.item_documento_id, produtoId })
    },
    [vincularMutation],
  )

  const itensSelecionados = useMemo(
    () => itens.filter((it) => selecoes[it.n_item]?.importar),
    [itens, selecoes],
  )
  const itensSemCategoria = useMemo(
    () => itensSelecionados.filter((it) => !selecoes[it.n_item]?.categoria),
    [itensSelecionados, selecoes],
  )
  const podeImportar =
    !importarMutation.isPending &&
    itensSelecionados.length > 0 &&
    itensSemCategoria.length === 0 &&
    !catPending

  const importar = useCallback(() => {
    const fornecedorPayload = payloadFornecedor(fornecedorSel)
    const fabricantePayload = fornecedorEhFabricante ? {} : payloadFabricante(fabricanteSel)
    const payload: ImportarCatalogoItemPayload[] = itens.map((item) => {
      const sel = selecoes[item.n_item] ?? selecaoPadrao(item)
      return {
        n_item: item.n_item,
        importar: sel.importar,
        categoria_catalogo: sel.categoria || undefined,
        codigo_catalogo: sel.codigo.trim() || undefined,
        atualizar_se_existir: sel.atualizar_se_existir,
        ...fornecedorPayload,
        ...fabricantePayload,
      }
    })
    importarMutation.mutate(payload)
  }, [itens, selecoes, importarMutation, fornecedorSel, fornecedorEhFabricante, fabricanteSel])

  if (!validId) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">Identificador da NF-e inválido.</div>
        <Link to={fiscalPaths.nfes}>Voltar à lista</Link>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.nfes}>NF-es recebidas</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.nfeDetalhe(documentoId)}>Detalhe</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Importar para o catálogo
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-1">Importar NF-e para o catálogo</h1>
      <p className="text-muted">
        Cada item é confrontado com o catálogo por GTIN, de-para fornecedor, código e similaridade.
        Confirme os possíveis duplicados, ajuste categorias e importe — os itens ficam rastreáveis e
        o de-para fornecedor↔produto é gravado automaticamente.
      </p>

      {previewQuery.isPending ? (
        <p className="text-muted">Carregando preview…</p>
      ) : previewQuery.isError ? (
        <div className="alert alert-danger">
          {extrairMensagemErroApi(previewQuery.error) ||
            'Não foi possível carregar o preview desta NF-e.'}
        </div>
      ) : previewQuery.data ? (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <p className="mb-1">
                <strong>{previewQuery.data.nome_emitente || '—'}</strong> · CNPJ{' '}
                <code>{previewQuery.data.cnpj_emitente || '—'}</code>
              </p>
              <p className="small text-muted mb-0">
                Chave <code>{previewQuery.data.chave_acesso || '—'}</code> · Objetivo:{' '}
                {labelObjetivoEntrada(previewQuery.data.objetivo_entrada)}
              </p>
            </div>
          </div>

          <div className="border rounded bg-light p-3 mb-3">
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label" htmlFor="categoria-padrao-nfe-cat">
                  Categoria padrão (itens novos sem categoria)
                </label>
                <select
                  id="categoria-padrao-nfe-cat"
                  className="form-select form-select-sm"
                  value={categoriaPadrao}
                  disabled={catPending}
                  onChange={(e) => setCategoriaPadrao(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_display ?? c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-auto">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  disabled={!categoriaPadrao}
                  onClick={aplicarCategoriaPadrao}
                >
                  Aplicar aos marcados
                </button>
              </div>
            </div>

            <hr className="my-3" />

            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label" htmlFor="fornecedor-nfe-cat">
                  Fornecedor (emitente da NF-e)
                </label>
                <select
                  id="fornecedor-nfe-cat"
                  className="form-select form-select-sm"
                  value={fornecedorSel}
                  onChange={(e) => setFornecedorSel(e.target.value as ParceiroSelecao)}
                >
                  <option value={PARCEIRO_EMITENTE} disabled={!emitenteFornecedorDisponivel}>
                    {emitenteFornecedorDisponivel
                      ? `Emitente: ${previewQuery.data?.nome_emitente || previewQuery.data?.cnpj_emitente || 'NF-e'}`
                      : 'Emitente sem CNPJ válido'}
                  </option>
                  <option value={PARCEIRO_NENHUM}>Nenhum fornecedor</option>
                  {fornecedores.length ? (
                    <optgroup label="Parceiros cadastrados">
                      {fornecedores.map((f) => (
                        <option key={f.id} value={`${PREFIXO_PARCEIRO}${f.id}`}>
                          {f.razao_social} ({f.cnpj})
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </div>
              <div className="col-md-auto">
                <div className="form-check">
                  <input
                    id="fornecedor-eh-fabricante-nfe-cat"
                    type="checkbox"
                    className="form-check-input"
                    checked={fornecedorEhFabricante}
                    onChange={(e) => setFornecedorEhFabricante(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="fornecedor-eh-fabricante-nfe-cat">
                    O fornecedor é o fabricante destes produtos
                  </label>
                </div>
              </div>
              {!fornecedorEhFabricante && (
                <div className="col-md-4">
                  <label className="form-label" htmlFor="fabricante-nfe-cat">
                    Fabricante
                  </label>
                  <select
                    id="fabricante-nfe-cat"
                    className="form-select form-select-sm"
                    value={fabricanteSel}
                    onChange={(e) => setFabricanteSel(e.target.value as ParceiroSelecao)}
                  >
                    <option value={PARCEIRO_EMITENTE} disabled={!emitenteFornecedorDisponivel}>
                      {emitenteFornecedorDisponivel
                        ? `Emitente: ${previewQuery.data?.nome_emitente || previewQuery.data?.cnpj_emitente || 'NF-e'}`
                        : 'Emitente sem CNPJ válido'}
                    </option>
                    <option value={PARCEIRO_NENHUM}>Nenhum fabricante</option>
                    {fornecedores.length ? (
                      <optgroup label="Parceiros cadastrados">
                        {fornecedores.map((f) => (
                          <option key={f.id} value={`${PREFIXO_PARCEIRO}${f.id}`}>
                            {f.razao_social} ({f.cnpj})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </div>
              )}
            </div>
            <p className="form-text mt-2 mb-0">
              Marque a opção acima quando o emitente da NF-e também fabrica os produtos. Caso seja
              apenas um distribuidor/revenda, desmarque e informe o fabricante (cadastrado nos
              parceiros). Fornecedor e fabricante são aplicados aos itens marcados para importação.
            </p>
          </div>

          {itensSemCategoria.length ? (
            <output className="alert alert-warning py-2 small d-block">
              Categorize todos os itens marcados para liberar a importação.
            </output>
          ) : null}

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Importar</th>
                  <th>#</th>
                  <th>Código (catálogo)</th>
                  <th>Descrição (NF-e)</th>
                  <th>NCM</th>
                  <th>Categoria</th>
                  <th>Situação no catálogo</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const sel = selecoes[item.n_item] ?? selecaoPadrao(item)
                  const diverge = Boolean(
                    item.produto_existente &&
                      nfeItemLinhaDivergeDoCatalogo(
                        item as unknown as NfeItemPreview,
                        sel.categoria,
                        item.produto_existente as unknown as NfeProdutoExistenteResumo,
                      ),
                  )
                  const aberto = Boolean(detalheAberto[item.n_item])
                  return (
                    <Fragment key={item.n_item}>
                      <tr className={diverge ? 'table-warning' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={sel.importar}
                            onChange={(e) =>
                              alterarSelecao(item.n_item, { importar: e.target.checked })
                            }
                            aria-label={`Importar item ${item.n_item}`}
                          />
                        </td>
                        <td>{item.n_item}</td>
                        <td style={{ minWidth: '10rem' }}>
                          <input
                            className="form-control form-control-sm"
                            maxLength={60}
                            value={sel.codigo}
                            onChange={(e) =>
                              alterarSelecao(item.n_item, { codigo: e.target.value })
                            }
                            aria-label={`Código do item ${item.n_item}`}
                          />
                        </td>
                        <td className="small">{item.x_prod}</td>
                        <td>
                          <code>{item.ncm || '—'}</code>
                        </td>
                        <td style={{ minWidth: '11rem' }}>
                          <select
                            className={`form-select form-select-sm ${
                              sel.importar && !sel.categoria ? 'is-invalid' : ''
                            }`}
                            value={sel.categoria}
                            disabled={!sel.importar || catPending}
                            onChange={(e) =>
                              alterarSelecao(item.n_item, { categoria: e.target.value })
                            }
                            aria-label={`Categoria do item ${item.n_item}`}
                          >
                            <option value="">Selecione...</option>
                            {categorias.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome_display ?? c.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: '14rem' }}>
                          <MatchSituacao
                            item={item}
                            vincularPendente={vincularMutation.isPending}
                            onVincular={handleVincular}
                          />
                          {item.produto_existente ? (
                            <div className="mt-1">
                              {diverge ? (
                                <div className="form-check d-inline-block me-2">
                                  <input
                                    id={`atualizar-${item.n_item}`}
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={sel.atualizar_se_existir}
                                    disabled={!sel.importar}
                                    onChange={(e) =>
                                      alterarSelecao(item.n_item, {
                                        atualizar_se_existir: e.target.checked,
                                      })
                                    }
                                  />
                                  <label
                                    className="form-check-label small"
                                    htmlFor={`atualizar-${item.n_item}`}
                                  >
                                    Atualizar
                                  </label>
                                </div>
                              ) : null}
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 align-baseline"
                                onClick={() =>
                                  setDetalheAberto((prev) => ({
                                    ...prev,
                                    [item.n_item]: !prev[item.n_item],
                                  }))
                                }
                              >
                                {aberto ? 'Ocultar campos' : 'Ver campos'}
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                      {aberto && item.produto_existente ? (
                        <tr className={diverge ? 'table-warning' : ''}>
                          <td colSpan={7} className="p-0">
                            <ComparacaoDivergencia
                              item={item}
                              categoria={sel.categoria}
                              categoriaLabel={categoriaLabel(sel.categoria)}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn btn-success"
            disabled={!podeImportar}
            onClick={importar}
          >
            {importarMutation.isPending ? 'Importando…' : 'Importar selecionados'}
          </button>

          <ResultadoImportacao resultado={resultado} />
        </>
      ) : null}
    </div>
  )
}
