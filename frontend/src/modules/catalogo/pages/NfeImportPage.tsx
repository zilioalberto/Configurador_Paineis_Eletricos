import { type ChangeEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useCategoriaListQuery } from '../hooks/useCategoriaListQuery'
import {
  aplicarImportacaoNfe,
  buscarProdutoResumoImportacaoNfe,
  listarFornecedoresNfe,
  previewNfeXml,
} from '../services/nfeImportService'
import type {
  NfeAplicarItem,
  NfeAplicarResponse,
  NfeFornecedorOption,
  NfePreviewResponse,
  NfeProdutoExistenteResumo,
  NfeSnapshot,
} from '../types/nfeImport'
import {
  buildNfeCamposComparacao,
  nfeItemLinhaDivergeDoCatalogo,
} from '../utils/nfeImportCompare'

const FORNECEDOR_EMITENTE = 'emitente'
const FORNECEDOR_NENHUM = 'nenhum'

type FornecedorSelecao = typeof FORNECEDOR_EMITENTE | typeof FORNECEDOR_NENHUM | `fornecedor:${string}`

type ItemSelecaoImportacao = {
  importar: boolean
  codigo: string
  fornecedor: FornecedorSelecao
  categoria: string
  atualizar_se_existir: boolean
}

function fornecedorExistenteValue(id: string): FornecedorSelecao {
  return `fornecedor:${id}`
}

function fornecedorPadraoSnapshot(snap: NfeSnapshot): FornecedorSelecao {
  return snap.emitente.cadastro_fornecedor_disponivel ? FORNECEDOR_EMITENTE : FORNECEDOR_NENHUM
}

function payloadFornecedor(fornecedor: FornecedorSelecao) {
  if (fornecedor === FORNECEDOR_EMITENTE) return { criar_fornecedor: true }
  if (fornecedor === FORNECEDOR_NENHUM) return { criar_fornecedor: false }
  return {
    criar_fornecedor: false,
    fornecedor_id: fornecedor.replace('fornecedor:', ''),
  }
}

/** Resumo legível dos tributos ICMS extraídos do XML (snapshot da API). */
function resumoImpostoIcms(imp?: Record<string, string> | null): string {
  if (!imp || Object.keys(imp).length === 0) return '—'
  const partes: string[] = []
  if (imp.orig) partes.push(`orig ${imp.orig}`)
  if (imp.cst_icms) partes.push(`CST ${imp.cst_icms}`)
  else if (imp.csosn) partes.push(`CSOSN ${imp.csosn}`)
  if (imp.icms_grupo_xml) partes.push(imp.icms_grupo_xml)
  if (imp.p_icms) partes.push(`${imp.p_icms}% ICMS`)
  if (imp.v_icms) partes.push(`R$ ${imp.v_icms}`)
  return partes.length ? partes.join(' · ') : '—'
}

export default function NfeImportPage() {
  const { showToast } = useToast()
  const { data: categorias = [], isPending: catPending } = useCategoriaListQuery()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<NfePreviewResponse | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [fabricantePadrao, setFabricantePadrao] = useState('')
  const [fornecedores, setFornecedores] = useState<NfeFornecedorOption[]>([])
  const [carregandoFornecedores, setCarregandoFornecedores] = useState(false)
  const [categoriaGlobal, setCategoriaGlobal] = useState('')
  const [fornecedorGlobal, setFornecedorGlobal] =
    useState<FornecedorSelecao>(FORNECEDOR_NENHUM)
  const [selecoes, setSelecoes] = useState<Record<number, ItemSelecaoImportacao>>({})
  const [resultadoImportacao, setResultadoImportacao] = useState<NfeAplicarResponse | null>(null)
  const [existentePorNItem, setExistentePorNItem] = useState<
    Record<number, NfeProdutoExistenteResumo | null>
  >({})
  const [detalheAberto, setDetalheAberto] = useState<Record<number, boolean>>({})
  const debounceResumoRef = useRef<number | null>(null)

  const snapshot = preview?.snapshot ?? null

  useEffect(() => {
    let ativo = true
    setCarregandoFornecedores(true)
    listarFornecedoresNfe()
      .then((dados) => {
        if (ativo) setFornecedores(dados)
      })
      .catch(() => {
        if (ativo) {
          showToast({
            variant: 'warning',
            title: 'Fornecedores',
            message: 'Não foi possível carregar a lista de fornecedores cadastrados.',
          })
        }
      })
      .finally(() => {
        if (ativo) setCarregandoFornecedores(false)
      })
    return () => {
      ativo = false
    }
  }, [showToast])

  const sincronizarSelecoes = useCallback((snap: NfeSnapshot) => {
    const fornecedorPadrao = fornecedorPadraoSnapshot(snap)
    const next: Record<number, ItemSelecaoImportacao> = {}
    for (const it of snap.itens) {
      next[it.n_item] = {
        importar: true,
        codigo: it.c_prod,
        fornecedor: fornecedorPadrao,
        categoria: it.produto_existente?.categoria ?? '',
        atualizar_se_existir: false,
      }
    }
    setSelecoes(next)
    setFornecedorGlobal(fornecedorPadrao)
    setCategoriaGlobal('')
  }, [])

  const handleArquivo = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const f = event.target.files?.[0] ?? null
      setArquivo(f)
      setPreview(null)
      setSelecoes({})
      setExistentePorNItem({})
      setDetalheAberto({})
      setCategoriaGlobal('')
      setFornecedorGlobal(FORNECEDOR_NENHUM)
      setResultadoImportacao(null)
    },
    []
  )

  const enviarPreview = useCallback(async () => {
    if (!arquivo) {
      showToast({ variant: 'warning', message: 'Selecione um ficheiro XML.' })
      return
    }
    setCarregandoPreview(true)
    try {
      const dados = await previewNfeXml(arquivo)
      setPreview(dados)
      setResultadoImportacao(null)
      sincronizarSelecoes(dados.snapshot)
      const emit = dados.snapshot.emitente
      if (emit.razao_social) {
        setFabricantePadrao((prev) =>
          prev.trim() ? prev : emit.razao_social.slice(0, 100)
        )
      }
      showToast({ variant: 'success', message: 'XML lido. Confira os dados abaixo.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Leitura do XML',
        message: extrairMensagemErroApi(err) || 'Não foi possível interpretar a NF-e.',
      })
    } finally {
      setCarregandoPreview(false)
    }
  }, [arquivo, showToast, sincronizarSelecoes])

  const itensPayload = useMemo((): NfeAplicarItem[] => {
    if (!snapshot) return []
    return snapshot.itens.map((it) => {
      const s = selecoes[it.n_item] ?? {
        importar: false,
        codigo: it.c_prod,
        fornecedor: FORNECEDOR_NENHUM,
        categoria: '',
      }
      return {
        n_item: it.n_item,
        importar: s.importar,
        ...payloadFornecedor(s.fornecedor),
        categoria_catalogo: s.categoria || undefined,
        codigo_catalogo: s.codigo.trim() || undefined,
        ...(s.atualizar_se_existir ? { atualizar_se_existir: true } : {}),
      }
    })
  }, [snapshot, selecoes])

  const itensSelecionados = useMemo(
    () => itensPayload.filter((it) => it.importar),
    [itensPayload]
  )
  const itensSemCategoria = useMemo(
    () => itensSelecionados.filter((it) => !it.categoria_catalogo),
    [itensSelecionados]
  )
  const podeAplicar =
    !aplicando && itensSelecionados.length > 0 && itensSemCategoria.length === 0 && !catPending
  const todosItensMarcados = useMemo(() => {
    if (!snapshot?.itens.length) return false
    return snapshot.itens.every((it) => selecoes[it.n_item]?.importar)
  }, [snapshot, selecoes])

  useEffect(() => {
    if (!snapshot?.itens?.length) {
      setExistentePorNItem({})
      return
    }
    const init: Record<number, NfeProdutoExistenteResumo | null> = {}
    for (const it of snapshot.itens) {
      init[it.n_item] = it.produto_existente ?? null
    }
    setExistentePorNItem(init)
  }, [snapshot])

  useEffect(() => {
    if (!snapshot?.itens?.length) return
    let cancelled = false
    if (debounceResumoRef.current) window.clearTimeout(debounceResumoRef.current)
    debounceResumoRef.current = window.setTimeout(() => {
      void (async () => {
        for (const it of snapshot.itens) {
          if (cancelled) return
          const sel = selecoes[it.n_item]
          const cod = (sel?.codigo ?? it.c_prod).trim()
          if (!cod) {
            setExistentePorNItem((p) => ({ ...p, [it.n_item]: null }))
            continue
          }
          const same = cod.toUpperCase() === it.c_prod.trim().toUpperCase()
          if (same) {
            setExistentePorNItem((p) => ({ ...p, [it.n_item]: it.produto_existente ?? null }))
            continue
          }
          const resumo = await buscarProdutoResumoImportacaoNfe(cod)
          if (!cancelled) {
            setExistentePorNItem((p) => ({ ...p, [it.n_item]: resumo }))
          }
        }
      })()
    }, 450)
    return () => {
      cancelled = true
      if (debounceResumoRef.current) {
        window.clearTimeout(debounceResumoRef.current)
        debounceResumoRef.current = null
      }
    }
  }, [snapshot, selecoes])

  const categoriaLabel = useCallback(
    (cid: string) =>
      categorias.find((c) => c.id === cid)?.nome_display ??
      categorias.find((c) => c.id === cid)?.nome ??
      cid,
    [categorias],
  )
  const fornecedorEmitenteLabel = useMemo(() => {
    if (!snapshot) return 'Emitente da NF-e'
    const emitente = snapshot.emitente.razao_social || snapshot.emitente.cnpj || 'Emitente da NF-e'
    return preview?.fornecedor_catalogo
      ? `${emitente} (cadastro existente)`
      : `${emitente} (criar/usar CNPJ da NF-e)`
  }, [preview, snapshot])
  const fornecedoresCombo = useMemo(() => {
    const emitenteId = preview?.fornecedor_catalogo?.id
    return fornecedores.filter((fornecedor) => fornecedor.id !== emitenteId)
  }, [fornecedores, preview])

  const alterarTodosImportar = useCallback(
    (importar: boolean) => {
      if (!snapshot) return
      setSelecoes((prev) => {
        const next = { ...prev }
        for (const it of snapshot.itens) {
          const atual = next[it.n_item] ?? {
            importar: false,
            codigo: it.c_prod,
            fornecedor: fornecedorPadraoSnapshot(snapshot),
            categoria: it.produto_existente?.categoria ?? '',
            atualizar_se_existir: false,
          }
          next[it.n_item] = { ...atual, importar }
        }
        return next
      })
    },
    [snapshot]
  )

  const aplicarCategoriaGlobal = useCallback(() => {
    if (!snapshot) return
    if (!categoriaGlobal) {
      showToast({ variant: 'warning', message: 'Selecione uma categoria para aplicar.' })
      return
    }
    setSelecoes((prev) => {
      const next = { ...prev }
      for (const it of snapshot.itens) {
        const atual = next[it.n_item]
        if (atual?.importar) {
          next[it.n_item] = { ...atual, categoria: categoriaGlobal }
        }
      }
      return next
    })
  }, [categoriaGlobal, showToast, snapshot])

  const aplicarFornecedorGlobal = useCallback(() => {
    if (!snapshot) return
    setSelecoes((prev) => {
      const next = { ...prev }
      for (const it of snapshot.itens) {
        const atual = next[it.n_item]
        if (atual?.importar) {
          next[it.n_item] = { ...atual, fornecedor: fornecedorGlobal }
        }
      }
      return next
    })
  }, [fornecedorGlobal, snapshot])

  const aplicar = useCallback(async () => {
    if (!preview) return
    if (itensSemCategoria.length) {
      showToast({
        variant: 'warning',
        message: 'Categorize todos os produtos marcados antes de importar.',
      })
      return
    }
    setAplicando(true)
    try {
      const res = await aplicarImportacaoNfe({
        snapshot: preview.snapshot,
        fabricante_padrao: fabricantePadrao.trim(),
        itens: itensPayload,
      })
      setResultadoImportacao(res)
      const partes = [
        res.fornecedor_criado ? 'Fornecedor criado.' : '',
        res.produtos_criados.length
          ? `${res.produtos_criados.length} produto(s) criado(s).`
          : '',
        res.produtos_ignorados.length
          ? `${res.produtos_ignorados.length} linha(s) ignorada(s).`
          : '',
      ]
        .filter(Boolean)
        .join(' ')
      showToast({
        variant: res.produtos_criados.length ? 'success' : 'warning',
        message: partes || 'Nenhuma alteração.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Importação',
        message: extrairMensagemErroApi(err) || 'Falha ao aplicar.',
      })
    } finally {
      setAplicando(false)
    }
  }, [preview, fabricantePadrao, itensPayload, itensSemCategoria.length, showToast])

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link to="/catalogo">Catálogo</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Importar NF-e
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-1">Importar NF-e de fornecedor</h1>
          <p className="text-muted mb-0">
            Envie o XML autorizado da nota (emitente = fornecedor). Serão sugeridos cadastro de
            fornecedor (CNPJ) e produtos com código, descrição, NCM, GTIN, preço unitário e, quando
            existirem no XML, CFOP e tributos (ICMS/PIS/COFINS) para gravar também nos itens fiscais
            do catálogo. Se o código já existir no catálogo, a linha fica a verde quando os dados
            coincidem com o XML, ou amarela quando há diferenças — use «Atualizar» para sobrescrever
            com os valores da nota (a categoria do produto existente é preenchida automaticamente).
          </p>
        </div>
        <Link to="/catalogo" className="btn btn-outline-secondary">
          Voltar à lista
        </Link>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5">1. Ficheiro XML</h2>
          <div className="row g-3 align-items-end">
            <div className="col-md-8">
              <label className="form-label" htmlFor="xml-nfe">
                XML da NF-e
              </label>
              <input
                id="xml-nfe"
                type="file"
                className="form-control"
                accept=".xml,application/xml,text/xml"
                onChange={handleArquivo}
              />
            </div>
            <div className="col-md-4">
              <button
                type="button"
                className="btn btn-primary w-100"
                disabled={!arquivo || carregandoPreview}
                onClick={() => void enviarPreview()}
              >
                {carregandoPreview ? 'A ler…' : 'Ler XML'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {preview ? (
        <>
          <div className="card mb-4">
            <div className="card-body">
              <h2 className="h5">2. Nota e fornecedor</h2>
              <p className="small text-muted mb-2">
                NF {preview.snapshot.identificacao.numero} / série{' '}
                {preview.snapshot.identificacao.serie} — chave{' '}
                <code>{preview.snapshot.identificacao.chave || '—'}</code>
              </p>
              <div className="row g-3">
                <div className="col-lg-6">
                  <strong>{preview.snapshot.emitente.razao_social}</strong>
                  <p className="small mb-1">
                    CNPJ: {preview.snapshot.emitente.cnpj || '—'} — IE:{' '}
                    {preview.snapshot.emitente.inscricao_estadual || '—'}
                  </p>
                  <p className="small mb-0 text-muted">
                    {preview.snapshot.emitente.logradouro}, {preview.snapshot.emitente.numero} —{' '}
                    {preview.snapshot.emitente.municipio}/{preview.snapshot.emitente.uf}
                  </p>
                  {preview.fornecedor_catalogo ? (
                    <p className="small text-success mt-2 mb-0">
                      Fornecedor já existe nos cadastros ({preview.fornecedor_catalogo.razao_social}).
                    </p>
                  ) : null}
                  {!preview.snapshot.emitente.cadastro_fornecedor_disponivel ? (
                    <p className="small text-warning mt-2 mb-0">
                      Emitente com CPF: não é possível usar o cadastro automático de fornecedor por
                      CNPJ; pode importar apenas produtos.
                    </p>
                  ) : null}
                </div>
                <div className="col-lg-6">
                  <label className="form-label" htmlFor="fab-padrao">
                    Fabricante nos produtos (opcional)
                  </label>
                  <input
                    id="fab-padrao"
                    className="form-control form-control-sm"
                    maxLength={100}
                    value={fabricantePadrao}
                    onChange={(e) => setFabricantePadrao(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h2 className="h5">3. Itens para o catálogo</h2>
              <div className="border rounded bg-light p-3 mb-3">
                <div className="row g-3 align-items-end">
                  <div className="col-md-3">
                    <label className="form-label" htmlFor="categoria-global-nfe">
                      Categoria para itens marcados
                    </label>
                    <select
                      id="categoria-global-nfe"
                      className="form-select form-select-sm"
                      value={categoriaGlobal}
                      disabled={catPending}
                      onChange={(e) => setCategoriaGlobal(e.target.value)}
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
                      disabled={!categoriaGlobal || !itensSelecionados.length}
                      onClick={aplicarCategoriaGlobal}
                    >
                      Aplicar categoria
                    </button>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="fornecedor-global-nfe">
                      Fornecedor para itens marcados
                    </label>
                    <select
                      id="fornecedor-global-nfe"
                      className="form-select form-select-sm"
                      value={fornecedorGlobal}
                      disabled={carregandoFornecedores}
                      onChange={(e) => setFornecedorGlobal(e.target.value as FornecedorSelecao)}
                    >
                      <option
                        value={FORNECEDOR_EMITENTE}
                        disabled={!preview.snapshot.emitente.cadastro_fornecedor_disponivel}
                      >
                        {fornecedorEmitenteLabel}
                      </option>
                      <option value={FORNECEDOR_NENHUM}>Nenhum fornecedor</option>
                      {fornecedoresCombo.length ? (
                        <optgroup label="Fornecedores cadastrados">
                          {fornecedoresCombo.map((fornecedor) => (
                            <option
                              key={fornecedor.id}
                              value={fornecedorExistenteValue(fornecedor.id)}
                            >
                              {fornecedor.razao_social} ({fornecedor.cnpj})
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </div>
                  <div className="col-md-auto">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={!itensSelecionados.length}
                      onClick={aplicarFornecedorGlobal}
                    >
                      Aplicar fornecedor
                    </button>
                  </div>
                  <div className="col-md-auto ms-md-auto d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => alterarTodosImportar(!todosItensMarcados)}
                    >
                      {todosItensMarcados ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>
                </div>
              </div>
              {itensSemCategoria.length ? (
                <div className="alert alert-warning py-2 small" role="status">
                  Categorize todos os produtos marcados para liberar a importação.
                </div>
              ) : null}
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Importar</th>
                      <th>#</th>
                      <th>Código catálogo</th>
                      <th>Fornecedor</th>
                      <th>Categoria</th>
                      <th className="text-nowrap">Situação</th>
                      <th>Descrição (XML)</th>
                      <th>NCM</th>
                      <th>CFOP</th>
                      <th className="text-nowrap">ICMS / PIS (resumo)</th>
                      <th>uCom</th>
                      <th>uTrib</th>
                      <th className="text-end">v. unit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.snapshot.itens.map((it) => {
                      const s = selecoes[it.n_item] ?? {
                        importar: true,
                        codigo: it.c_prod,
                        fornecedor: fornecedorPadraoSnapshot(preview.snapshot),
                        categoria: it.produto_existente?.categoria ?? '',
                        atualizar_se_existir: false,
                      }
                      const ex = existentePorNItem[it.n_item] ?? it.produto_existente ?? null
                      const diverge = Boolean(
                        ex && nfeItemLinhaDivergeDoCatalogo(it, s.categoria, ex),
                      )
                      const trClass = ex ? (diverge ? 'table-warning' : 'table-success') : ''
                      const aberto = Boolean(detalheAberto[it.n_item])
                      return (
                        <Fragment key={it.n_item}>
                          <tr className={trClass}>
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={s.importar}
                                onChange={(e) =>
                                  setSelecoes((prev) => ({
                                    ...prev,
                                    [it.n_item]: { ...s, importar: e.target.checked },
                                  }))
                                }
                                aria-label={`Importar item ${it.n_item}`}
                              />
                            </td>
                            <td>{it.n_item}</td>
                            <td style={{ minWidth: '8rem' }}>
                              <input
                                className="form-control form-control-sm"
                                maxLength={60}
                                value={s.codigo}
                                onChange={(e) =>
                                  setSelecoes((prev) => ({
                                    ...prev,
                                    [it.n_item]: { ...s, codigo: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td style={{ minWidth: '18rem' }}>
                              <select
                                className="form-select form-select-sm"
                                value={s.fornecedor}
                                disabled={!s.importar || carregandoFornecedores}
                                onChange={(e) =>
                                  setSelecoes((prev) => ({
                                    ...prev,
                                    [it.n_item]: {
                                      ...s,
                                      fornecedor: e.target.value as FornecedorSelecao,
                                    },
                                  }))
                                }
                                aria-label={`Fornecedor do item ${it.n_item}`}
                              >
                                <option
                                  value={FORNECEDOR_EMITENTE}
                                  disabled={
                                    !preview.snapshot.emitente.cadastro_fornecedor_disponivel
                                  }
                                >
                                  {fornecedorEmitenteLabel}
                                </option>
                                <option value={FORNECEDOR_NENHUM}>Nenhum fornecedor</option>
                                {fornecedoresCombo.length ? (
                                  <optgroup label="Fornecedores cadastrados">
                                    {fornecedoresCombo.map((fornecedor) => (
                                      <option
                                        key={fornecedor.id}
                                        value={fornecedorExistenteValue(fornecedor.id)}
                                      >
                                        {fornecedor.razao_social} ({fornecedor.cnpj})
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                              </select>
                            </td>
                            <td style={{ minWidth: '14rem' }}>
                              <select
                                className={`form-select form-select-sm ${
                                  s.importar && !s.categoria ? 'is-invalid' : ''
                                }`}
                                value={s.categoria}
                                disabled={!s.importar || catPending}
                                onChange={(e) =>
                                  setSelecoes((prev) => ({
                                    ...prev,
                                    [it.n_item]: { ...s, categoria: e.target.value },
                                  }))
                                }
                                aria-label={`Categoria do item ${it.n_item}`}
                              >
                                <option value="">Selecione...</option>
                                {categorias.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome_display ?? c.nome}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="small" style={{ minWidth: '9rem' }}>
                              {!ex ? (
                                <span className="badge bg-secondary">Novo</span>
                              ) : diverge ? (
                                <>
                                  <span className="badge bg-warning text-dark">Divergente</span>
                                  <div className="form-check mt-1 mb-0">
                                    <input
                                      id={`nfe-atualizar-${it.n_item}`}
                                      type="checkbox"
                                      className="form-check-input"
                                      checked={s.atualizar_se_existir}
                                      disabled={!s.importar}
                                      onChange={(e) =>
                                        setSelecoes((prev) => ({
                                          ...prev,
                                          [it.n_item]: {
                                            ...s,
                                            atualizar_se_existir: e.target.checked,
                                          },
                                        }))
                                      }
                                    />
                                    <label
                                      className="form-check-label"
                                      htmlFor={`nfe-atualizar-${it.n_item}`}
                                    >
                                      Atualizar
                                    </label>
                                  </div>
                                </>
                              ) : (
                                <span className="badge bg-success">Alinhado</span>
                              )}
                              {ex ? (
                                <div>
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 align-baseline"
                                    onClick={() =>
                                      setDetalheAberto((d) => ({
                                        ...d,
                                        [it.n_item]: !d[it.n_item],
                                      }))
                                    }
                                  >
                                    {aberto ? 'Ocultar' : 'Ver campos'}
                                  </button>
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <span className="small">{it.x_prod}</span>
                            </td>
                            <td>
                              <code>{it.ncm || '—'}</code>
                            </td>
                            <td>
                              <code>{it.cfop || '—'}</code>
                            </td>
                            <td className="small text-break" style={{ maxWidth: '14rem' }}>
                              <span className="d-block">{resumoImpostoIcms(it.imposto)}</span>
                              {it.imposto?.cst_pis ? (
                                <span className="text-muted">
                                  PIS CST {it.imposto.cst_pis}
                                  {it.imposto.p_pis ? ` · ${it.imposto.p_pis}%` : ''}
                                </span>
                              ) : null}
                            </td>
                            <td>{it.unidade_catalogo}</td>
                            <td>{it.u_trib_catalogo || '—'}</td>
                            <td className="text-end">{it.v_un_com}</td>
                          </tr>
                          {aberto && ex ? (
                            <tr className={trClass}>
                              <td colSpan={13} className="p-0">
                                <div className="px-3 py-2 border-top bg-white small">
                                  <strong className="d-block mb-2">
                                    XML × catálogo (código {ex.codigo})
                                  </strong>
                                  <div className="table-responsive">
                                    <table className="table table-sm table-bordered mb-0">
                                      <thead className="table-light">
                                        <tr>
                                          <th>Campo</th>
                                          <th>Valor no XML / seleção</th>
                                          <th>Valor no catálogo</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {buildNfeCamposComparacao(
                                          it,
                                          s.categoria,
                                          categoriaLabel(s.categoria),
                                          ex,
                                        ).map((row) => (
                                          <tr
                                            key={row.id}
                                            className={row.diverge ? 'table-warning' : ''}
                                          >
                                            <td>{row.label}</td>
                                            <td>{row.xml || '—'}</td>
                                            <td>{row.catalogo || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
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
                disabled={!podeAplicar}
                onClick={() => void aplicar()}
              >
                {aplicando ? 'A importar…' : 'Aplicar importação'}
              </button>

              {resultadoImportacao ? (
                <div className="mt-4 border-top pt-3">
                  <h3 className="h6">Resultado da última importação</h3>
                  <ul className="small mb-2">
                    {resultadoImportacao.fornecedor_id ? (
                      <li>
                        Fornecedor (ID interno): <code>{resultadoImportacao.fornecedor_id}</code>
                        {resultadoImportacao.fornecedor_criado ? ' — registo novo.' : ' — já existia.'}
                      </li>
                    ) : (
                      <li>Nenhum fornecedor associado nesta execução.</li>
                    )}
                    {resultadoImportacao.fornecedores_associados?.length ? (
                      <li>
                        Fornecedores usados nos produtos:{' '}
                        {resultadoImportacao.fornecedores_associados
                          .map((fornecedor) => fornecedor.razao_social)
                          .join(', ')}
                      </li>
                    ) : null}
                    {resultadoImportacao.produtos_criados.length ? (
                      <li>
                        Produtos criados ({resultadoImportacao.produtos_criados.length}):{' '}
                        <code>{resultadoImportacao.produtos_criados.join(', ')}</code>
                      </li>
                    ) : null}
                    {resultadoImportacao.produtos_atualizados?.length ? (
                      <li>
                        Produtos atualizados com dados do XML (
                        {resultadoImportacao.produtos_atualizados.length}):{' '}
                        <code>{resultadoImportacao.produtos_atualizados.join(', ')}</code>
                      </li>
                    ) : null}
                  </ul>
                  {resultadoImportacao.avisos.length ? (
                    <div className="alert alert-warning py-2 small mb-2" role="status">
                      <strong>Avisos</strong>
                      <ul className="mb-0 mt-1">
                        {resultadoImportacao.avisos.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {resultadoImportacao.produtos_ignorados.length ? (
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
                          {resultadoImportacao.produtos_ignorados.map((row, idx) => (
                            <tr key={`${row.n_item}-${idx}`}>
                              <td>{row.n_item}</td>
                              <td>{row.codigo ?? '—'}</td>
                              <td>{row.motivo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
