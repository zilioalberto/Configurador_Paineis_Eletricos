import { type ChangeEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { objetivoEntradaOptions } from '@/modules/fiscal/constants/objetivoEntradaOptions'
import { importarNfeXmlManual, obterNfeRecebida } from '@/modules/fiscal/services/fiscalNfeService'
import type { ObjetivoEntradaFiscal } from '@/modules/fiscal/types/documentoFiscalRecebido'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useCategoriaListQuery } from '../hooks/useCategoriaListQuery'
import { catalogoPaths } from '../catalogoPaths'
import { useNfeExistentePorItem } from '../hooks/useNfeExistentePorItem'
import {
  aplicarImportacaoNfe,
  listarFornecedoresNfe,
  previewNfeXml,
} from '../services/nfeImportService'
import type { CategoriaProduto } from '../types/categoria'
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

import './NfeImportPage.css'

const FORNECEDOR_EMITENTE = 'emitente'
const FORNECEDOR_NENHUM = 'nenhum'

type FornecedorSelecao = typeof FORNECEDOR_EMITENTE | typeof FORNECEDOR_NENHUM | `fornecedor:${string}`

type ItemSelecaoImportacao = {
  importar: boolean
  codigo: string
  fornecedor: FornecedorSelecao
  fabricante: FornecedorSelecao
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

function payloadFabricante(fabricante: FornecedorSelecao) {
  if (fabricante === FORNECEDOR_EMITENTE) return { criar_fabricante: true }
  if (fabricante === FORNECEDOR_NENHUM) return { criar_fabricante: false }
  return {
    criar_fabricante: false,
    fabricante_id: fabricante.replace('fornecedor:', ''),
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

type NfeItemSnapshot = NfeSnapshot['itens'][number]

function selecaoPadraoItem(item: NfeItemSnapshot, snapshot: NfeSnapshot): ItemSelecaoImportacao {
  return {
    importar: true,
    codigo: item.c_prod,
    fornecedor: fornecedorPadraoSnapshot(snapshot),
    fabricante: fornecedorPadraoSnapshot(snapshot),
    categoria: item.produto_existente?.categoria ?? '',
    atualizar_se_existir: false,
  }
}

function selecaoFallbackPayload(item: NfeItemSnapshot): ItemSelecaoImportacao {
  return {
    importar: false,
    codigo: item.c_prod,
    fornecedor: FORNECEDOR_NENHUM,
    fabricante: FORNECEDOR_NENHUM,
    categoria: '',
    atualizar_se_existir: false,
  }
}

function itemPayloadAplicacao(
  item: NfeItemSnapshot,
  selecao: ItemSelecaoImportacao
): NfeAplicarItem {
  return {
    n_item: item.n_item,
    importar: selecao.importar,
    ...payloadFornecedor(selecao.fornecedor),
    ...payloadFabricante(selecao.fabricante),
    categoria_catalogo: selecao.categoria || undefined,
    codigo_catalogo: selecao.codigo.trim() || undefined,
    ...(selecao.atualizar_se_existir ? { atualizar_se_existir: true } : {}),
  }
}

async function carregarPreviewDocumentoFiscal(documentoId: number) {
  const documento = await obterNfeRecebida(documentoId)
  if (!documento.xml_original?.trim()) {
    throw new Error('Esta NF-e fiscal não possui XML original armazenado.')
  }
  const file = new File([documento.xml_original], `nfe-fiscal-${documento.id}.xml`, {
    type: 'text/xml',
  })
  return {
    dados: await previewNfeXml(file),
    origem: { id: documento.id, numero: documento.numero },
    objetivoEntrada: documento.objetivo_entrada,
    xml: documento.xml_original,
  }
}

function deveRegistrarNfeFiscal(
  registrarNoFiscal: boolean,
  origemFiscal: { id: number; numero: string } | null,
  xmlFonte: string
) {
  return registrarNoFiscal && !origemFiscal && Boolean(xmlFonte.trim())
}

function mensagemResultadoImportacao(
  resultado: NfeAplicarResponse,
  resFiscal: Awaited<ReturnType<typeof importarNfeXmlManual>> | null
) {
  return [
    resFiscal ? (resFiscal.created ? 'NF-e registrada no fiscal.' : 'NF-e já existia no fiscal.') : '',
    resultado.fornecedor_criado ? 'Fornecedor criado.' : '',
    resultado.produtos_criados.length
      ? `${resultado.produtos_criados.length} produto(s) criado(s).`
      : '',
    resultado.produtos_ignorados.length
      ? `${resultado.produtos_ignorados.length} linha(s) ignorada(s).`
      : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function linhaCatalogoClass(existente: NfeProdutoExistenteResumo | null, diverge: boolean): string {
  if (!existente) return ''
  return diverge ? 'table-warning' : 'table-success'
}

function NfeStatusCell({
  aberto,
  diverge,
  existente,
  item,
  selecao,
  onSelecaoChange,
  onToggleDetalhe,
}: Readonly<{
  aberto: boolean
  diverge: boolean
  existente: NfeProdutoExistenteResumo | null
  item: NfeItemSnapshot
  selecao: ItemSelecaoImportacao
  onSelecaoChange: (nItem: number, selecao: ItemSelecaoImportacao) => void
  onToggleDetalhe: (nItem: number) => void
}>) {
  if (!existente) {
    return (
      <td className="small nfe-col-situacao">
        <span className="badge bg-secondary">Novo</span>
      </td>
    )
  }

  return (
    <td className="small nfe-col-situacao">
      {diverge ? (
        <>
          <span className="badge bg-warning text-dark">Divergente</span>
          <div className="form-check mt-1 mb-0">
            <input
              id={`nfe-atualizar-${item.n_item}`}
              type="checkbox"
              className="form-check-input"
              checked={selecao.atualizar_se_existir}
              disabled={!selecao.importar}
              onChange={(e) =>
                onSelecaoChange(item.n_item, {
                  ...selecao,
                  atualizar_se_existir: e.target.checked,
                })
              }
            />
            <label className="form-check-label" htmlFor={`nfe-atualizar-${item.n_item}`}>
              Atualizar
            </label>
          </div>
        </>
      ) : (
        <span className="badge bg-success">Alinhado</span>
      )}
      <div>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 align-baseline"
          onClick={() => onToggleDetalhe(item.n_item)}
        >
          {aberto ? 'Ocultar' : 'Ver campos'}
        </button>
      </div>
    </td>
  )
}

function NfeItemRow({
  aberto,
  carregandoFornecedores,
  categoriaLabel,
  categorias,
  catPending,
  diverge,
  emitenteCadastroDisponivel,
  existente,
  fornecedorEmitenteLabel,
  fornecedoresCombo,
  item,
  selecao,
  trClass,
  onSelecaoChange,
  onToggleDetalhe,
}: Readonly<{
  aberto: boolean
  carregandoFornecedores: boolean
  categoriaLabel: (cid: string) => string
  categorias: CategoriaProduto[]
  catPending: boolean
  diverge: boolean
  emitenteCadastroDisponivel: boolean
  existente: NfeProdutoExistenteResumo | null
  fornecedorEmitenteLabel: string
  fornecedoresCombo: NfeFornecedorOption[]
  item: NfeItemSnapshot
  selecao: ItemSelecaoImportacao
  trClass: string
  onSelecaoChange: (nItem: number, selecao: ItemSelecaoImportacao) => void
  onToggleDetalhe: (nItem: number) => void
}>) {
  return (
    <Fragment>
      <tr className={trClass}>
        <td>
          <input
            type="checkbox"
            className="form-check-input"
            checked={selecao.importar}
            onChange={(e) =>
              onSelecaoChange(item.n_item, { ...selecao, importar: e.target.checked })
            }
            aria-label={`Importar item ${item.n_item}`}
          />
        </td>
        <td>{item.n_item}</td>
        <td className="nfe-col-codigo">
          <input
            className="form-control form-control-sm"
            maxLength={60}
            value={selecao.codigo}
            onChange={(e) =>
              onSelecaoChange(item.n_item, { ...selecao, codigo: e.target.value })
            }
          />
        </td>
        <td className="nfe-col-fornecedor">
          <div className="d-grid gap-2">
            <div>
              <label className="form-label small text-muted mb-1" htmlFor={`nfe-fornecedor-${item.n_item}`}>
                Fornecedor
              </label>
              <select
                id={`nfe-fornecedor-${item.n_item}`}
                className="form-select form-select-sm"
                value={selecao.fornecedor}
                disabled={!selecao.importar || carregandoFornecedores}
                onChange={(e) => {
                  const fornecedor = e.target.value as FornecedorSelecao
                  onSelecaoChange(item.n_item, {
                    ...selecao,
                    fornecedor,
                    fabricante:
                      selecao.fabricante === selecao.fornecedor ? fornecedor : selecao.fabricante,
                  })
                }}
                aria-label={`Fornecedor do item ${item.n_item}`}
              >
                <option value={FORNECEDOR_EMITENTE} disabled={!emitenteCadastroDisponivel}>
                  {fornecedorEmitenteLabel}
                </option>
                <option value={FORNECEDOR_NENHUM}>Nenhum fornecedor</option>
                {fornecedoresCombo.length ? (
                  <optgroup label="Fornecedores cadastrados">
                    {fornecedoresCombo.map((fornecedor) => (
                      <option key={fornecedor.id} value={fornecedorExistenteValue(fornecedor.id)}>
                        {fornecedor.razao_social} ({fornecedor.cnpj})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
            <div>
              <label className="form-label small text-muted mb-1" htmlFor={`nfe-fabricante-${item.n_item}`}>
                Fabricante
              </label>
              <select
                id={`nfe-fabricante-${item.n_item}`}
                className="form-select form-select-sm"
                value={selecao.fabricante}
                disabled={!selecao.importar || carregandoFornecedores}
                onChange={(e) =>
                  onSelecaoChange(item.n_item, {
                    ...selecao,
                    fabricante: e.target.value as FornecedorSelecao,
                  })
                }
                aria-label={`Fabricante do item ${item.n_item}`}
              >
                <option value={FORNECEDOR_EMITENTE} disabled={!emitenteCadastroDisponivel}>
                  {fornecedorEmitenteLabel}
                </option>
                <option value={FORNECEDOR_NENHUM}>Nenhum fabricante</option>
                {fornecedoresCombo.length ? (
                  <optgroup label="Fabricantes cadastrados">
                    {fornecedoresCombo.map((fornecedor) => (
                      <option key={fornecedor.id} value={fornecedorExistenteValue(fornecedor.id)}>
                        {fornecedor.razao_social} ({fornecedor.cnpj})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
          </div>
        </td>
        <td className="nfe-col-categoria">
          <select
            className={`form-select form-select-sm ${
              selecao.importar && !selecao.categoria ? 'is-invalid' : ''
            }`}
            value={selecao.categoria}
            disabled={!selecao.importar || catPending}
            onChange={(e) =>
              onSelecaoChange(item.n_item, { ...selecao, categoria: e.target.value })
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
        <NfeStatusCell
          aberto={aberto}
          diverge={diverge}
          existente={existente}
          item={item}
          selecao={selecao}
          onSelecaoChange={onSelecaoChange}
          onToggleDetalhe={onToggleDetalhe}
        />
        <td>
          <span className="small">{item.x_prod}</span>
        </td>
        <td className="nfe-col-compact-hide">
          <code>{item.ncm || '—'}</code>
        </td>
        <td className="nfe-col-compact-hide">
          <code>{item.cfop || '—'}</code>
        </td>
        <td className="small text-break nfe-col-compact-hide" style={{ maxWidth: '14rem' }}>
          <span className="d-block">{resumoImpostoIcms(item.imposto)}</span>
          {item.imposto?.cst_pis ? (
            <span className="text-muted">
              PIS CST {item.imposto.cst_pis}
              {item.imposto.p_pis ? ` · ${item.imposto.p_pis}%` : ''}
            </span>
          ) : null}
        </td>
        <td className="nfe-col-compact-hide">{item.unidade_catalogo}</td>
        <td className="nfe-col-compact-hide">{item.u_trib_catalogo || '—'}</td>
        <td className="text-end nfe-col-compact-hide">{item.v_un_com}</td>
      </tr>
      {aberto && existente ? (
        <tr className={trClass}>
          <td colSpan={13} className="p-0">
            <div className="px-3 py-2 border-top bg-white small">
              <strong className="d-block mb-2">XML × catálogo (código {existente.codigo})</strong>
              <div className="nfe-campos-comparacao-wrap">
                <table className="table table-sm table-bordered mb-0 nfe-campos-comparacao-table">
                  <thead className="table-light">
                    <tr>
                      <th>Campo</th>
                      <th>Valor no XML / seleção</th>
                      <th>Valor no catálogo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildNfeCamposComparacao(
                      item,
                      selecao.categoria,
                      categoriaLabel(selecao.categoria),
                      existente,
                    ).map((row) => (
                      <tr key={row.id} className={row.diverge ? 'table-warning' : ''}>
                        <td>{row.label}</td>
                        <td data-label="XML / seleção">{row.xml || '—'}</td>
                        <td data-label="Catálogo">{row.catalogo || '—'}</td>
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
}

function NfeItensTableRows({
  carregandoFornecedores,
  categoriaLabel,
  categorias,
  catPending,
  detalheAberto,
  emitenteCadastroDisponivel,
  existentePorNItem,
  fornecedorEmitenteLabel,
  fornecedoresCombo,
  selecoes,
  snapshot,
  onSelecaoChange,
  onToggleDetalhe,
}: Readonly<{
  carregandoFornecedores: boolean
  categoriaLabel: (cid: string) => string
  categorias: CategoriaProduto[]
  catPending: boolean
  detalheAberto: Record<number, boolean>
  emitenteCadastroDisponivel: boolean
  existentePorNItem: Record<number, NfeProdutoExistenteResumo | null>
  fornecedorEmitenteLabel: string
  fornecedoresCombo: NfeFornecedorOption[]
  selecoes: Record<number, ItemSelecaoImportacao>
  snapshot: NfeSnapshot
  onSelecaoChange: (nItem: number, selecao: ItemSelecaoImportacao) => void
  onToggleDetalhe: (nItem: number) => void
}>) {
  return (
    <>
      {snapshot.itens.map((item) => {
        const selecao = selecoes[item.n_item] ?? selecaoPadraoItem(item, snapshot)
        const existente = existentePorNItem[item.n_item] ?? item.produto_existente ?? null
        const diverge = Boolean(
          existente && nfeItemLinhaDivergeDoCatalogo(item, selecao.categoria, existente)
        )
        return (
          <NfeItemRow
            key={item.n_item}
            aberto={Boolean(detalheAberto[item.n_item])}
            carregandoFornecedores={carregandoFornecedores}
            categoriaLabel={categoriaLabel}
            categorias={categorias}
            catPending={catPending}
            diverge={diverge}
            emitenteCadastroDisponivel={emitenteCadastroDisponivel}
            existente={existente}
            fornecedorEmitenteLabel={fornecedorEmitenteLabel}
            fornecedoresCombo={fornecedoresCombo}
            item={item}
            selecao={selecao}
            trClass={linhaCatalogoClass(existente, diverge)}
            onSelecaoChange={onSelecaoChange}
            onToggleDetalhe={onToggleDetalhe}
          />
        )
      })}
    </>
  )
}

function NfeResultadoImportacao({
  resultado,
}: Readonly<{ resultado: NfeAplicarResponse | null }>) {
  if (!resultado) return null

  return (
    <div className="mt-4 border-top pt-3">
      <h3 className="h6">Resultado da última importação</h3>
      <ul className="small mb-2">
        {resultado.fornecedor_id ? (
          <li>
            Fornecedor (ID interno): <code>{resultado.fornecedor_id}</code>
            {resultado.fornecedor_criado ? ' — registo novo.' : ' — já existia.'}
          </li>
        ) : (
          <li>Nenhum fornecedor associado nesta execução.</li>
        )}
        {resultado.fornecedores_associados?.length ? (
          <li>
            Fornecedores usados nos produtos:{' '}
            {resultado.fornecedores_associados
              .map((fornecedor) => fornecedor.razao_social)
              .join(', ')}
          </li>
        ) : null}
        {resultado.produtos_criados.length ? (
          <li>
            Produtos criados ({resultado.produtos_criados.length}):{' '}
            <code>{resultado.produtos_criados.join(', ')}</code>
          </li>
        ) : null}
        {resultado.produtos_atualizados?.length ? (
          <li>
            Produtos atualizados com dados do XML ({resultado.produtos_atualizados.length}):{' '}
            <code>{resultado.produtos_atualizados.join(', ')}</code>
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
  )
}

/** Wizard de importação de produtos a partir de XML de NF-e. */
export default function NfeImportPage() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const documentoFiscalIdParam = searchParams.get('documentoFiscalId')
  const { data: categorias = [], isPending: catPending } = useCategoriaListQuery()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [xmlFonte, setXmlFonte] = useState('')
  const [preview, setPreview] = useState<NfePreviewResponse | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [registrandoFiscal, setRegistrandoFiscal] = useState(false)
  const [fabricantePadrao, setFabricantePadrao] = useState('')
  const [objetivoEntrada, setObjetivoEntrada] = useState<ObjetivoEntradaFiscal | ''>('')
  const [registrarNoFiscal, setRegistrarNoFiscal] = useState(false)
  const [origemFiscal, setOrigemFiscal] = useState<{ id: number; numero: string } | null>(null)
  const [fornecedores, setFornecedores] = useState<NfeFornecedorOption[]>([])
  const [carregandoFornecedores, setCarregandoFornecedores] = useState(false)
  const [categoriaGlobal, setCategoriaGlobal] = useState('')
  const [fornecedorGlobal, setFornecedorGlobal] =
    useState<FornecedorSelecao>(FORNECEDOR_NENHUM)
  const [fabricanteGlobal, setFabricanteGlobal] =
    useState<FornecedorSelecao>(FORNECEDOR_NENHUM)
  const [selecoes, setSelecoes] = useState<Record<number, ItemSelecaoImportacao>>({})
  const [resultadoImportacao, setResultadoImportacao] = useState<NfeAplicarResponse | null>(null)
  const [detalheAberto, setDetalheAberto] = useState<Record<number, boolean>>({})
  const documentoFiscalCarregadoRef = useRef<string | null>(null)

  const snapshot = preview?.snapshot ?? null
  const existentePorNItem = useNfeExistentePorItem(snapshot, selecoes)

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
        fabricante: fornecedorPadrao,
        categoria: it.produto_existente?.categoria ?? '',
        atualizar_se_existir: false,
      }
    }
    setSelecoes(next)
    setFornecedorGlobal(fornecedorPadrao)
    setFabricanteGlobal(fornecedorPadrao)
    setCategoriaGlobal('')
  }, [])

  const handleArquivo = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const f = event.target.files?.[0] ?? null
      setArquivo(f)
      setXmlFonte('')
      setOrigemFiscal(null)
      setRegistrarNoFiscal(false)
      setPreview(null)
      setSelecoes({})
      setDetalheAberto({})
      setCategoriaGlobal('')
      setFornecedorGlobal(FORNECEDOR_NENHUM)
      setFabricanteGlobal(FORNECEDOR_NENHUM)
      setObjetivoEntrada('')
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
      const xml = await arquivo.text()
      const dados = await previewNfeXml(arquivo)
      setXmlFonte(xml)
      setOrigemFiscal(null)
      setPreview(dados)
      setResultadoImportacao(null)
      sincronizarSelecoes(dados.snapshot)
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

  useEffect(() => {
    if (!documentoFiscalIdParam || documentoFiscalCarregadoRef.current === documentoFiscalIdParam) {
      return
    }
    const documentoId = Number(documentoFiscalIdParam)
    if (!Number.isFinite(documentoId) || documentoId <= 0) {
      showToast({
        variant: 'warning',
        title: 'NF-e fiscal',
        message: 'Identificador da NF-e fiscal inválido.',
      })
      documentoFiscalCarregadoRef.current = documentoFiscalIdParam
      return
    }

    let ativo = true
    documentoFiscalCarregadoRef.current = documentoFiscalIdParam
    setCarregandoPreview(true)
    carregarPreviewDocumentoFiscal(documentoId)
      .then(({ dados, origem, objetivoEntrada: objetivo, xml }) => {
        if (!ativo) return
        setArquivo(null)
        setXmlFonte(xml)
        setOrigemFiscal(origem)
        setRegistrarNoFiscal(false)
        setPreview(dados)
        setResultadoImportacao(null)
        setObjetivoEntrada(objetivo)
        sincronizarSelecoes(dados.snapshot)
        showToast({
          variant: 'success',
          message: 'NF-e fiscal carregada para importação no catálogo.',
        })
      })
      .catch((err) => {
        if (!ativo) return
        showToast({
          variant: 'danger',
          title: 'NF-e fiscal',
          message: extrairMensagemErroApi(err) || 'Não foi possível carregar a NF-e fiscal.',
        })
      })
      .finally(() => {
        if (ativo) setCarregandoPreview(false)
      })

    return () => {
      ativo = false
    }
  }, [documentoFiscalIdParam, showToast, sincronizarSelecoes])

  const itensPayload = useMemo((): NfeAplicarItem[] => {
    if (!snapshot) return []
    return snapshot.itens.map((it) => {
      return itemPayloadAplicacao(it, selecoes[it.n_item] ?? selecaoFallbackPayload(it))
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
    !aplicando &&
    !registrandoFiscal &&
    itensSelecionados.length > 0 &&
    itensSemCategoria.length === 0 &&
    Boolean(objetivoEntrada) &&
    !catPending
  const todosItensMarcados = useMemo(() => {
    if (!snapshot?.itens.length) return false
    return snapshot.itens.every((it) => selecoes[it.n_item]?.importar)
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
            fabricante: fornecedorPadraoSnapshot(snapshot),
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
          next[it.n_item] = {
            ...atual,
            fornecedor: fornecedorGlobal,
            fabricante:
              atual.fabricante === atual.fornecedor ? fornecedorGlobal : atual.fabricante,
          }
        }
      }
      return next
    })
  }, [fornecedorGlobal, snapshot])

  const aplicarFabricanteGlobal = useCallback(() => {
    if (!snapshot) return
    setSelecoes((prev) => {
      const next = { ...prev }
      for (const it of snapshot.itens) {
        const atual = next[it.n_item]
        if (atual?.importar) {
          next[it.n_item] = { ...atual, fabricante: fabricanteGlobal }
        }
      }
      return next
    })
  }, [fabricanteGlobal, snapshot])

  const alterarSelecao = useCallback((nItem: number, selecao: ItemSelecaoImportacao) => {
    setSelecoes((prev) => ({ ...prev, [nItem]: selecao }))
  }, [])

  const alternarDetalhe = useCallback((nItem: number) => {
    setDetalheAberto((prev) => ({ ...prev, [nItem]: !prev[nItem] }))
  }, [])

  const aplicar = useCallback(async () => {
    if (!preview) return
    if (itensSemCategoria.length) {
      showToast({
        variant: 'warning',
        message: 'Categorize todos os produtos marcados antes de importar.',
      })
      return
    }
    if (!objetivoEntrada) {
      showToast({
        variant: 'warning',
        message: 'Informe o objetivo da entrada antes de importar.',
      })
      return
    }
    setAplicando(true)
    const registrarFiscal = deveRegistrarNfeFiscal(registrarNoFiscal, origemFiscal, xmlFonte)
    setRegistrandoFiscal(registrarFiscal)
    try {
      const resFiscal = registrarFiscal
        ? await importarNfeXmlManual({ xml: xmlFonte, objetivo_entrada: objetivoEntrada })
        : null
      const res = await aplicarImportacaoNfe({
        snapshot: preview.snapshot,
        fabricante_padrao: fabricantePadrao.trim(),
        objetivo_entrada: objetivoEntrada,
        itens: itensPayload,
      })
      setResultadoImportacao(res)
      const mensagem = mensagemResultadoImportacao(res, resFiscal)
      showToast({
        variant: res.produtos_criados.length ? 'success' : 'warning',
        message: mensagem || 'Nenhuma alteração.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Importação',
        message: extrairMensagemErroApi(err) || 'Falha ao aplicar.',
      })
    } finally {
      setAplicando(false)
      setRegistrandoFiscal(false)
    }
  }, [
    preview,
    fabricantePadrao,
    objetivoEntrada,
    itensPayload,
    itensSemCategoria.length,
    registrarNoFiscal,
    origemFiscal,
    xmlFonte,
    showToast,
  ])

  return (
    <div className="container-fluid nfe-import-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link to={catalogoPaths.produtos}>Catálogo</Link>
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
        <Link to={catalogoPaths.produtos} className="btn btn-outline-secondary">
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
          {origemFiscal ? (
            <div className="alert alert-info py-2 small mt-3 mb-0">
              XML carregado da NF-e fiscal #{origemFiscal.id}
              {origemFiscal.numero ? ` (número ${origemFiscal.numero})` : ''}. Você pode seguir
              direto para o catálogo sem reenviar o arquivo.
            </div>
          ) : null}
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
                  {preview.snapshot.emitente.cadastro_fornecedor_disponivel ? null : (
                    <p className="small text-warning mt-2 mb-0">
                      Emitente com CPF: não é possível usar o cadastro automático de fornecedor por
                      CNPJ; pode importar apenas produtos.
                    </p>
                  )}
                </div>
                <div className="col-lg-6">
                  <label className="form-label" htmlFor="fab-padrao">
                    Fabricante em texto padrão (opcional)
                  </label>
                  <input
                    id="fab-padrao"
                    className="form-control form-control-sm"
                    maxLength={100}
                    value={fabricantePadrao}
                    onChange={(e) => setFabricantePadrao(e.target.value)}
                  />
                  <p className="form-text mb-0">
                    Usado apenas como texto do fabricante quando preenchido; a seleção por item
                    continua gravando o vínculo do fabricante.
                  </p>
                </div>
                <div className="col-lg-6">
                  <label className="form-label" htmlFor="nfe-catalogo-objetivo-entrada">
                    Objetivo da entrada
                  </label>
                  <select
                    id="nfe-catalogo-objetivo-entrada"
                    className="form-select form-select-sm"
                    value={objetivoEntrada}
                    onChange={(e) => setObjetivoEntrada(e.target.value as ObjetivoEntradaFiscal | '')}
                    required
                  >
                    <option value="">Selecione...</option>
                    {objetivoEntradaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="form-text mb-0">
                    Será gravado nos itens fiscais de referência criados a partir desta NF-e.
                  </p>
                </div>
                <div className="col-lg-6">
                  {origemFiscal ? (
                    <div className="alert alert-success py-2 small mb-0">
                      Esta NF-e já está registrada no Fiscal. Ao aplicar a importação, os itens serão
                      adicionados ao catálogo sem duplicar o XML fiscal.
                    </div>
                  ) : (
                    <div className="form-check mt-lg-4">
                      <input
                        id="nfe-registrar-fiscal"
                        type="checkbox"
                        className="form-check-input"
                        checked={registrarNoFiscal}
                        disabled={!xmlFonte.trim()}
                        onChange={(e) => setRegistrarNoFiscal(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="nfe-registrar-fiscal">
                        Registrar também no Fiscal
                      </label>
                      <div className="form-text">
                        Use quando quiser importar uma única vez e aproveitar a mesma NF-e nos
                        módulos Fiscal e Catálogo.
                      </div>
                    </div>
                  )}
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
                  <div className="col-md-3">
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
                  <div className="col-md-3">
                    <label className="form-label" htmlFor="fabricante-global-nfe">
                      Fabricante para itens marcados
                    </label>
                    <select
                      id="fabricante-global-nfe"
                      className="form-select form-select-sm"
                      value={fabricanteGlobal}
                      disabled={carregandoFornecedores}
                      onChange={(e) => setFabricanteGlobal(e.target.value as FornecedorSelecao)}
                    >
                      <option
                        value={FORNECEDOR_EMITENTE}
                        disabled={!preview.snapshot.emitente.cadastro_fornecedor_disponivel}
                      >
                        {fornecedorEmitenteLabel}
                      </option>
                      <option value={FORNECEDOR_NENHUM}>Nenhum fabricante</option>
                      {fornecedoresCombo.length ? (
                        <optgroup label="Fabricantes cadastrados">
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
                      onClick={aplicarFabricanteGlobal}
                    >
                      Aplicar fabricante
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
                <output className="alert alert-warning py-2 small d-block">
                  Categorize todos os produtos marcados para liberar a importação.
                </output>
              ) : null}
              {!objetivoEntrada ? (
                <output className="alert alert-warning py-2 small d-block">
                  Informe o objetivo da entrada para liberar a importação.
                </output>
              ) : null}
              <div className="table-responsive nfe-itens-table-wrap">
                <table className="table table-sm align-middle nfe-itens-table">
                  <thead>
                    <tr>
                      <th>Importar</th>
                      <th>#</th>
                      <th>Código catálogo</th>
                      <th>Fornecedor / Fabricante</th>
                      <th>Categoria</th>
                      <th className="text-nowrap">Situação</th>
                      <th>Descrição (XML)</th>
                      <th className="nfe-col-compact-hide">NCM</th>
                      <th className="nfe-col-compact-hide">CFOP</th>
                      <th className="text-nowrap nfe-col-compact-hide">ICMS / PIS (resumo)</th>
                      <th className="nfe-col-compact-hide">uCom</th>
                      <th className="nfe-col-compact-hide">uTrib</th>
                      <th className="text-end nfe-col-compact-hide">v. unit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <NfeItensTableRows
                      carregandoFornecedores={carregandoFornecedores}
                      categoriaLabel={categoriaLabel}
                      categorias={categorias}
                      catPending={catPending}
                      detalheAberto={detalheAberto}
                      emitenteCadastroDisponivel={
                        preview.snapshot.emitente.cadastro_fornecedor_disponivel
                      }
                      existentePorNItem={existentePorNItem}
                      fornecedorEmitenteLabel={fornecedorEmitenteLabel}
                      fornecedoresCombo={fornecedoresCombo}
                      selecoes={selecoes}
                      snapshot={preview.snapshot}
                      onSelecaoChange={alterarSelecao}
                      onToggleDetalhe={alternarDetalhe}
                    />
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="btn btn-success"
                disabled={!podeAplicar}
                onClick={() => void aplicar()}
              >
                {registrandoFiscal ? 'Registrando fiscal…' : aplicando ? 'A importar…' : 'Aplicar importação'}
              </button>

              <NfeResultadoImportacao resultado={resultadoImportacao} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
