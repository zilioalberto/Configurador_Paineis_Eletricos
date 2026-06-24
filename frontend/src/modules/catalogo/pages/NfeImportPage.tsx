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

type SelecoesMap = Record<number, ItemSelecaoImportacao>

/** Monta o mapa inicial de seleções (todos marcados) a partir do snapshot. */
function construirSelecoesIniciais(snap: NfeSnapshot): SelecoesMap {
  const fornecedorPadrao = fornecedorPadraoSnapshot(snap)
  const next: SelecoesMap = {}
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
  return next
}

/** Define o flag "importar" para todas as linhas, criando seleção padrão se necessário. */
function definirImportarTodos(prev: SelecoesMap, snapshot: NfeSnapshot, importar: boolean): SelecoesMap {
  const next = { ...prev }
  for (const it of snapshot.itens) {
    const atual = next[it.n_item] ?? selecaoPadraoItem(it, snapshot)
    next[it.n_item] = { ...atual, importar }
  }
  return next
}

/** Aplica uma categoria a todas as linhas atualmente marcadas para importação. */
function aplicarCategoriaSelecionados(
  prev: SelecoesMap,
  snapshot: NfeSnapshot,
  categoria: string
): SelecoesMap {
  const next = { ...prev }
  for (const it of snapshot.itens) {
    const atual = next[it.n_item]
    if (atual?.importar) next[it.n_item] = { ...atual, categoria }
  }
  return next
}

/** Aplica um fornecedor às linhas marcadas, espelhando no fabricante quando coincidiam. */
function aplicarFornecedorSelecionados(
  prev: SelecoesMap,
  snapshot: NfeSnapshot,
  fornecedor: FornecedorSelecao
): SelecoesMap {
  const next = { ...prev }
  for (const it of snapshot.itens) {
    const atual = next[it.n_item]
    if (atual?.importar) {
      next[it.n_item] = {
        ...atual,
        fornecedor,
        fabricante: atual.fabricante === atual.fornecedor ? fornecedor : atual.fabricante,
      }
    }
  }
  return next
}

/** Aplica um fabricante a todas as linhas marcadas para importação. */
function aplicarFabricanteSelecionados(
  prev: SelecoesMap,
  snapshot: NfeSnapshot,
  fabricante: FornecedorSelecao
): SelecoesMap {
  const next = { ...prev }
  for (const it of snapshot.itens) {
    const atual = next[it.n_item]
    if (atual?.importar) next[it.n_item] = { ...atual, fabricante }
  }
  return next
}

type ShowToast = ReturnType<typeof useToast>['showToast']

/** Efeito: carrega a lista de fornecedores cadastrados; retorna função de limpeza. */
function efeitoCarregarFornecedores(
  setFornecedores: (lista: NfeFornecedorOption[]) => void,
  setCarregando: (carregando: boolean) => void,
  showToast: ShowToast
): () => void {
  let ativo = true
  setCarregando(true)
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
      if (ativo) setCarregando(false)
    })
  return () => {
    ativo = false
  }
}

type PreviewFiscalSetters = {
  setArquivo: (arquivo: File | null) => void
  setXmlFonte: (xml: string) => void
  setOrigemFiscal: (origem: { id: number; numero: string } | null) => void
  setRegistrarNoFiscal: (registrar: boolean) => void
  setPreview: (preview: NfePreviewResponse | null) => void
  setResultadoImportacao: (resultado: NfeAplicarResponse | null) => void
  setObjetivoEntrada: (objetivo: ObjetivoEntradaFiscal | '') => void
  setCarregandoPreview: (carregando: boolean) => void
  sincronizarSelecoes: (snap: NfeSnapshot) => void
  showToast: ShowToast
}

/** Efeito: carrega o preview a partir de uma NF-e fiscal existente; retorna limpeza. */
function efeitoCarregarDocumentoFiscal(
  documentoFiscalIdParam: string | null,
  carregadoRef: { current: string | null },
  setters: PreviewFiscalSetters
): (() => void) | undefined {
  const { showToast } = setters
  if (!documentoFiscalIdParam || carregadoRef.current === documentoFiscalIdParam) {
    return undefined
  }
  const documentoId = Number(documentoFiscalIdParam)
  if (!Number.isFinite(documentoId) || documentoId <= 0) {
    showToast({
      variant: 'warning',
      title: 'NF-e fiscal',
      message: 'Identificador da NF-e fiscal inválido.',
    })
    carregadoRef.current = documentoFiscalIdParam
    return undefined
  }

  let ativo = true
  carregadoRef.current = documentoFiscalIdParam
  setters.setCarregandoPreview(true)
  carregarPreviewDocumentoFiscal(documentoId)
    .then(({ dados, origem, objetivoEntrada: objetivo, xml }) => {
      if (!ativo) return
      setters.setArquivo(null)
      setters.setXmlFonte(xml)
      setters.setOrigemFiscal(origem)
      setters.setRegistrarNoFiscal(false)
      setters.setPreview(dados)
      setters.setResultadoImportacao(null)
      setters.setObjetivoEntrada(objetivo)
      setters.sincronizarSelecoes(dados.snapshot)
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
      if (ativo) setters.setCarregandoPreview(false)
    })

  return () => {
    ativo = false
  }
}

/** Rótulo do fornecedor emitente exibido nos seletores globais. */
function montarFornecedorEmitenteLabel(
  snapshot: NfeSnapshot | null,
  preview: NfePreviewResponse | null
): string {
  if (!snapshot) return 'Emitente da NF-e'
  const emitente = snapshot.emitente.razao_social || snapshot.emitente.cnpj || 'Emitente da NF-e'
  return preview?.fornecedor_catalogo
    ? `${emitente} (cadastro existente)`
    : `${emitente} (criar/usar CNPJ da NF-e)`
}

/** Lê o XML selecionado e popula o preview da importação. */
async function executarPreviewArquivo(
  arquivo: File,
  sincronizarSelecoes: (snap: NfeSnapshot) => void,
  setters: PreviewFiscalSetters
): Promise<void> {
  setters.setCarregandoPreview(true)
  try {
    const xml = await arquivo.text()
    const dados = await previewNfeXml(arquivo)
    setters.setXmlFonte(xml)
    setters.setOrigemFiscal(null)
    setters.setPreview(dados)
    setters.setResultadoImportacao(null)
    sincronizarSelecoes(dados.snapshot)
    setters.showToast({ variant: 'success', message: 'XML lido. Confira os dados abaixo.' })
  } catch (err) {
    setters.showToast({
      variant: 'danger',
      title: 'Leitura do XML',
      message: extrairMensagemErroApi(err) || 'Não foi possível interpretar a NF-e.',
    })
  } finally {
    setters.setCarregandoPreview(false)
  }
}

type AplicacaoImportacaoParams = {
  preview: NfePreviewResponse
  objetivoEntrada: ObjetivoEntradaFiscal
  itensPayload: NfeAplicarItem[]
  registrarNoFiscal: boolean
  origemFiscal: { id: number; numero: string } | null
  xmlFonte: string
}

type AplicacaoImportacaoSetters = {
  setAplicando: (aplicando: boolean) => void
  setRegistrandoFiscal: (registrando: boolean) => void
  setResultadoImportacao: (resultado: NfeAplicarResponse | null) => void
  showToast: ShowToast
}

/** Executa a importação (incluindo registro fiscal opcional) e reporta o resultado. */
async function executarAplicacaoImportacao(
  params: AplicacaoImportacaoParams,
  setters: AplicacaoImportacaoSetters
): Promise<void> {
  const { preview, objetivoEntrada, itensPayload, registrarNoFiscal, origemFiscal, xmlFonte } =
    params
  setters.setAplicando(true)
  const registrarFiscal = deveRegistrarNfeFiscal(registrarNoFiscal, origemFiscal, xmlFonte)
  setters.setRegistrandoFiscal(registrarFiscal)
  try {
    const resFiscal = registrarFiscal
      ? await importarNfeXmlManual({ xml: xmlFonte, objetivo_entrada: objetivoEntrada })
      : null
    const res = await aplicarImportacaoNfe({
      snapshot: preview.snapshot,
      objetivo_entrada: objetivoEntrada,
      itens: itensPayload,
    })
    setters.setResultadoImportacao(res)
    const mensagem = mensagemResultadoImportacao(res, resFiscal)
    setters.showToast({
      variant: res.produtos_criados.length ? 'success' : 'warning',
      message: mensagem || 'Nenhuma alteração.',
    })
  } catch (err) {
    setters.showToast({
      variant: 'danger',
      title: 'Importação',
      message: extrairMensagemErroApi(err) || 'Falha ao aplicar.',
    })
  } finally {
    setters.setAplicando(false)
    setters.setRegistrandoFiscal(false)
  }
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

type NfeNotaFornecedorCardProps = Readonly<{
  preview: NfePreviewResponse
  objetivoEntrada: ObjetivoEntradaFiscal | ''
  setObjetivoEntrada: (objetivo: ObjetivoEntradaFiscal | '') => void
  origemFiscal: { id: number; numero: string } | null
  registrarNoFiscal: boolean
  setRegistrarNoFiscal: (registrar: boolean) => void
  xmlFonte: string
}>

/** Cartão "2. Nota e fornecedor" do wizard de importação. */
function NfeNotaFornecedorCard({
  preview,
  objetivoEntrada,
  setObjetivoEntrada,
  origemFiscal,
  registrarNoFiscal,
  setRegistrarNoFiscal,
  xmlFonte,
}: NfeNotaFornecedorCardProps) {
  const { snapshot } = preview
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="h5">2. Nota e fornecedor</h2>
        <p className="small text-muted mb-2">
          NF {snapshot.identificacao.numero} / série {snapshot.identificacao.serie} — chave{' '}
          <code>{snapshot.identificacao.chave || '—'}</code>
        </p>
        <div className="row g-3">
          <div className="col-lg-6">
            <strong>{snapshot.emitente.razao_social}</strong>
            <p className="small mb-1">
              CNPJ: {snapshot.emitente.cnpj || '—'} — IE:{' '}
              {snapshot.emitente.inscricao_estadual || '—'}
            </p>
            <p className="small mb-0 text-muted">
              {snapshot.emitente.logradouro}, {snapshot.emitente.numero} —{' '}
              {snapshot.emitente.municipio}/{snapshot.emitente.uf}
            </p>
            {preview.fornecedor_catalogo ? (
              <p className="small text-success mt-2 mb-0">
                Fornecedor já existe nos cadastros ({preview.fornecedor_catalogo.razao_social}).
              </p>
            ) : null}
            {snapshot.emitente.cadastro_fornecedor_disponivel ? null : (
              <p className="small text-warning mt-2 mb-0">
                Emitente com CPF: não é possível usar o cadastro automático de fornecedor por CNPJ;
                pode importar apenas produtos.
              </p>
            )}
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
                  Use quando quiser importar uma única vez e aproveitar a mesma NF-e nos módulos
                  Fiscal e Catálogo.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type NfeFornecedorComboProps = Readonly<{
  id: string
  label: string
  value: FornecedorSelecao
  disabled: boolean
  emitenteDisponivel: boolean
  emitenteLabel: string
  rotuloNenhum: string
  grupoLabel: string
  fornecedoresCombo: NfeFornecedorOption[]
  onChange: (valor: FornecedorSelecao) => void
}>

/** Seletor reutilizável de fornecedor/fabricante (emitente, nenhum ou cadastrado). */
function NfeFornecedorCombo({
  id,
  label,
  value,
  disabled,
  emitenteDisponivel,
  emitenteLabel,
  rotuloNenhum,
  grupoLabel,
  fornecedoresCombo,
  onChange,
}: NfeFornecedorComboProps) {
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="form-select form-select-sm"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as FornecedorSelecao)}
      >
        <option value={FORNECEDOR_EMITENTE} disabled={!emitenteDisponivel}>
          {emitenteLabel}
        </option>
        <option value={FORNECEDOR_NENHUM}>{rotuloNenhum}</option>
        {fornecedoresCombo.length ? (
          <optgroup label={grupoLabel}>
            {fornecedoresCombo.map((fornecedor) => (
              <option key={fornecedor.id} value={fornecedorExistenteValue(fornecedor.id)}>
                {fornecedor.razao_social} ({fornecedor.cnpj})
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </>
  )
}

type NfeItensCatalogoCardProps = Readonly<{
  preview: NfePreviewResponse
  categoriaGlobal: string
  setCategoriaGlobal: (categoria: string) => void
  catPending: boolean
  categorias: CategoriaProduto[]
  itensSelecionadosLength: number
  itensSemCategoriaLength: number
  objetivoEntrada: ObjetivoEntradaFiscal | ''
  fornecedorGlobal: FornecedorSelecao
  setFornecedorGlobal: (valor: FornecedorSelecao) => void
  fabricanteGlobal: FornecedorSelecao
  setFabricanteGlobal: (valor: FornecedorSelecao) => void
  carregandoFornecedores: boolean
  fornecedorEmitenteLabel: string
  fornecedoresCombo: NfeFornecedorOption[]
  todosItensMarcados: boolean
  aplicarCategoriaGlobal: () => void
  aplicarFornecedorGlobal: () => void
  aplicarFabricanteGlobal: () => void
  alterarTodosImportar: (importar: boolean) => void
  categoriaLabel: (cid: string) => string
  detalheAberto: Record<number, boolean>
  existentePorNItem: Record<number, NfeProdutoExistenteResumo | null>
  selecoes: SelecoesMap
  alterarSelecao: (nItem: number, selecao: ItemSelecaoImportacao) => void
  alternarDetalhe: (nItem: number) => void
  podeAplicar: boolean
  registrandoFiscal: boolean
  aplicando: boolean
  aplicar: () => void
  resultadoImportacao: NfeAplicarResponse | null
}>

/** Cartão "3. Itens para o catálogo": toolbar global, tabela e ação de aplicar. */
function NfeItensCatalogoCard(props: NfeItensCatalogoCardProps) {
  const {
    preview,
    categoriaGlobal,
    setCategoriaGlobal,
    catPending,
    categorias,
    itensSelecionadosLength,
    itensSemCategoriaLength,
    objetivoEntrada,
    fornecedorGlobal,
    setFornecedorGlobal,
    fabricanteGlobal,
    setFabricanteGlobal,
    carregandoFornecedores,
    fornecedorEmitenteLabel,
    fornecedoresCombo,
    todosItensMarcados,
    podeAplicar,
    registrandoFiscal,
    aplicando,
  } = props
  const emitenteDisponivel = preview.snapshot.emitente.cadastro_fornecedor_disponivel
  let rotuloBotaoAplicar = 'Aplicar importação'
  if (registrandoFiscal) rotuloBotaoAplicar = 'Registrando fiscal…'
  else if (aplicando) rotuloBotaoAplicar = 'A importar…'

  return (
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
                disabled={!categoriaGlobal || !itensSelecionadosLength}
                onClick={props.aplicarCategoriaGlobal}
              >
                Aplicar categoria
              </button>
            </div>
            <div className="col-md-3">
              <NfeFornecedorCombo
                id="fornecedor-global-nfe"
                label="Fornecedor para itens marcados"
                value={fornecedorGlobal}
                disabled={carregandoFornecedores}
                emitenteDisponivel={emitenteDisponivel}
                emitenteLabel={fornecedorEmitenteLabel}
                rotuloNenhum="Nenhum fornecedor"
                grupoLabel="Fornecedores cadastrados"
                fornecedoresCombo={fornecedoresCombo}
                onChange={setFornecedorGlobal}
              />
            </div>
            <div className="col-md-auto">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={!itensSelecionadosLength}
                onClick={props.aplicarFornecedorGlobal}
              >
                Aplicar fornecedor
              </button>
            </div>
            <div className="col-md-3">
              <NfeFornecedorCombo
                id="fabricante-global-nfe"
                label="Fabricante para itens marcados"
                value={fabricanteGlobal}
                disabled={carregandoFornecedores}
                emitenteDisponivel={emitenteDisponivel}
                emitenteLabel={fornecedorEmitenteLabel}
                rotuloNenhum="Nenhum fabricante"
                grupoLabel="Fabricantes cadastrados"
                fornecedoresCombo={fornecedoresCombo}
                onChange={setFabricanteGlobal}
              />
            </div>
            <div className="col-md-auto">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={!itensSelecionadosLength}
                onClick={props.aplicarFabricanteGlobal}
              >
                Aplicar fabricante
              </button>
            </div>
            <div className="col-md-auto ms-md-auto d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => props.alterarTodosImportar(!todosItensMarcados)}
              >
                {todosItensMarcados ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
          </div>
        </div>
        {itensSemCategoriaLength ? (
          <output className="alert alert-warning py-2 small d-block">
            Categorize todos os produtos marcados para liberar a importação.
          </output>
        ) : null}
        {objetivoEntrada ? null : (
          <output className="alert alert-warning py-2 small d-block">
            Informe o objetivo da entrada para liberar a importação.
          </output>
        )}
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
                categoriaLabel={props.categoriaLabel}
                categorias={categorias}
                catPending={catPending}
                detalheAberto={props.detalheAberto}
                emitenteCadastroDisponivel={emitenteDisponivel}
                existentePorNItem={props.existentePorNItem}
                fornecedorEmitenteLabel={fornecedorEmitenteLabel}
                fornecedoresCombo={fornecedoresCombo}
                selecoes={props.selecoes}
                snapshot={preview.snapshot}
                onSelecaoChange={props.alterarSelecao}
                onToggleDetalhe={props.alternarDetalhe}
              />
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="btn btn-success"
          disabled={!podeAplicar}
          onClick={() => props.aplicar()}
        >
          {rotuloBotaoAplicar}
        </button>

        <NfeResultadoImportacao resultado={props.resultadoImportacao} />
      </div>
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

  useEffect(
    () => efeitoCarregarFornecedores(setFornecedores, setCarregandoFornecedores, showToast),
    [showToast]
  )

  const sincronizarSelecoes = useCallback((snap: NfeSnapshot) => {
    const fornecedorPadrao = fornecedorPadraoSnapshot(snap)
    setSelecoes(construirSelecoesIniciais(snap))
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
    await executarPreviewArquivo(arquivo, sincronizarSelecoes, {
      setArquivo,
      setXmlFonte,
      setOrigemFiscal,
      setRegistrarNoFiscal,
      setPreview,
      setResultadoImportacao,
      setObjetivoEntrada,
      setCarregandoPreview,
      sincronizarSelecoes,
      showToast,
    })
  }, [arquivo, showToast, sincronizarSelecoes])

  useEffect(
    () =>
      efeitoCarregarDocumentoFiscal(documentoFiscalIdParam, documentoFiscalCarregadoRef, {
        setArquivo,
        setXmlFonte,
        setOrigemFiscal,
        setRegistrarNoFiscal,
        setPreview,
        setResultadoImportacao,
        setObjetivoEntrada,
        setCarregandoPreview,
        sincronizarSelecoes,
        showToast,
      }),
    [documentoFiscalIdParam, showToast, sincronizarSelecoes]
  )

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
  const fornecedorEmitenteLabel = useMemo(
    () => montarFornecedorEmitenteLabel(snapshot, preview),
    [preview, snapshot]
  )
  const fornecedoresCombo = useMemo(() => {
    const emitenteId = preview?.fornecedor_catalogo?.id
    return fornecedores.filter((fornecedor) => fornecedor.id !== emitenteId)
  }, [fornecedores, preview])

  const alterarTodosImportar = useCallback(
    (importar: boolean) => {
      if (!snapshot) return
      setSelecoes((prev) => definirImportarTodos(prev, snapshot, importar))
    },
    [snapshot]
  )

  const aplicarCategoriaGlobal = useCallback(() => {
    if (!snapshot) return
    if (!categoriaGlobal) {
      showToast({ variant: 'warning', message: 'Selecione uma categoria para aplicar.' })
      return
    }
    setSelecoes((prev) => aplicarCategoriaSelecionados(prev, snapshot, categoriaGlobal))
  }, [categoriaGlobal, showToast, snapshot])

  const aplicarFornecedorGlobal = useCallback(() => {
    if (!snapshot) return
    setSelecoes((prev) => aplicarFornecedorSelecionados(prev, snapshot, fornecedorGlobal))
  }, [fornecedorGlobal, snapshot])

  const aplicarFabricanteGlobal = useCallback(() => {
    if (!snapshot) return
    setSelecoes((prev) => aplicarFabricanteSelecionados(prev, snapshot, fabricanteGlobal))
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
    await executarAplicacaoImportacao(
      { preview, objetivoEntrada, itensPayload, registrarNoFiscal, origemFiscal, xmlFonte },
      { setAplicando, setRegistrandoFiscal, setResultadoImportacao, showToast }
    )
  }, [
    preview,
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
          <NfeNotaFornecedorCard
            preview={preview}
            objetivoEntrada={objetivoEntrada}
            setObjetivoEntrada={setObjetivoEntrada}
            origemFiscal={origemFiscal}
            registrarNoFiscal={registrarNoFiscal}
            setRegistrarNoFiscal={setRegistrarNoFiscal}
            xmlFonte={xmlFonte}
          />

          <NfeItensCatalogoCard
            preview={preview}
            categoriaGlobal={categoriaGlobal}
            setCategoriaGlobal={setCategoriaGlobal}
            catPending={catPending}
            categorias={categorias}
            itensSelecionadosLength={itensSelecionados.length}
            itensSemCategoriaLength={itensSemCategoria.length}
            objetivoEntrada={objetivoEntrada}
            fornecedorGlobal={fornecedorGlobal}
            setFornecedorGlobal={setFornecedorGlobal}
            fabricanteGlobal={fabricanteGlobal}
            setFabricanteGlobal={setFabricanteGlobal}
            carregandoFornecedores={carregandoFornecedores}
            fornecedorEmitenteLabel={fornecedorEmitenteLabel}
            fornecedoresCombo={fornecedoresCombo}
            todosItensMarcados={todosItensMarcados}
            aplicarCategoriaGlobal={aplicarCategoriaGlobal}
            aplicarFornecedorGlobal={aplicarFornecedorGlobal}
            aplicarFabricanteGlobal={aplicarFabricanteGlobal}
            alterarTodosImportar={alterarTodosImportar}
            categoriaLabel={categoriaLabel}
            detalheAberto={detalheAberto}
            existentePorNItem={existentePorNItem}
            selecoes={selecoes}
            alterarSelecao={alterarSelecao}
            alternarDetalhe={alternarDetalhe}
            podeAplicar={podeAplicar}
            registrandoFiscal={registrandoFiscal}
            aplicando={aplicando}
            aplicar={() => void aplicar()}
            resultadoImportacao={resultadoImportacao}
          />
        </>
      ) : null}
    </div>
  )
}
