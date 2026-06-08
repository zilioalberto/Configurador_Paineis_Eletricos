import { Fragment, type ChangeEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'

import { objetivoEntradaOptions, labelObjetivoEntrada } from '../constants/objetivoEntradaOptions'
import {
  labelObjetivoSaida,
  labelTipoDocumentoEmitido,
  objetivoSaidaOptions,
} from '../constants/objetivoSaidaOptions'
import { fiscalPaths } from '../fiscalPaths'
import { useRelatorioNfesQuery } from '../hooks/useRelatorioNfesQuery'
import type {
  ObjetivoEntradaFiscal,
  ObjetivoSaidaFiscal,
  RelatorioNFeDocumentoRow,
  RelatorioNFeFiltros,
  TipoMovimentoRelatorioNFe,
} from '../types/documentoFiscalRecebido'
import {
  formatChaveAcesso,
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
} from '../utils/fiscalDisplay'

function mesAtualPeriodo() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const inicio = new Date(ano, mes, 1)
  const fim = new Date(ano, mes + 1, 0)
  const iso = (data: Date) => data.toISOString().slice(0, 10)
  return { data_inicio: iso(inicio), data_fim: iso(fim) }
}

function formatQuantidade(valor: string): string {
  const n = Number(valor)
  if (Number.isNaN(n)) return valor
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
}

function itensResumo(doc: RelatorioNFeDocumentoRow): string {
  if (!doc.itens.length) return 'Sem itens parseados'
  return doc.itens
    .slice(0, 3)
    .map((item) => `${item.numero_item}. ${item.descricao}`)
    .join(' | ')
}

const FILTROS_INICIAIS: RelatorioNFeFiltros = {
  tipo_movimento: 'ENTRADA',
  objetivo_entrada: '',
  objetivo_saida: '',
  cnpj_emitente: '',
  cnpj_destinatario: '',
  fornecedor: '',
  cliente: '',
  ...mesAtualPeriodo(),
}

function labelObjetivoRelatorio(doc: RelatorioNFeDocumentoRow): string {
  return doc.tipo_movimento === 'SAIDA'
    ? labelObjetivoSaida(doc.objetivo as ObjetivoSaidaFiscal)
    : labelObjetivoEntrada(doc.objetivo as ObjetivoEntradaFiscal)
}

function labelObjetivoResumo(row: { tipo_movimento: 'ENTRADA' | 'SAIDA'; objetivo: string }): string {
  return row.tipo_movimento === 'SAIDA'
    ? labelObjetivoSaida(row.objetivo)
    : labelObjetivoEntrada(row.objetivo as ObjetivoEntradaFiscal)
}

/** Relatório contábil/gerencial de NF-es com totais e expansão rápida de itens. */
export default function RelatorioNfesPage() {
  const [filtros, setFiltros] = useState<RelatorioNFeFiltros>(FILTROS_INICIAIS)
  const [itensAbertos, setItensAbertos] = useState<Record<string, boolean>>({})
  const { data, isPending, isError, error, refetch } = useRelatorioNfesQuery(filtros)

  const documentos = data?.documentos ?? []
  const totalItens = useMemo(
    () => documentos.reduce((acc, doc) => acc + doc.itens.length, 0),
    [documentos],
  )

  const onFiltroChange =
    (field: keyof RelatorioNFeFiltros) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value
      const nextValue =
        field === 'cnpj_emitente' || field === 'cnpj_destinatario'
          ? aplicarMascaraCnpj(value)
          : field === 'tipo_movimento'
            ? (value as TipoMovimentoRelatorioNFe)
            : value
      setFiltros((prev) => ({
        ...prev,
        [field]: nextValue,
      }))
    }

  const limparPeriodo = () => {
    setFiltros((prev) => ({ ...prev, data_inicio: '', data_fim: '' }))
  }

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link to={fiscalPaths.home}>Fiscal</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Relatório de NF-es
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-1">Relatório de NF-es</h1>
          <p className="text-muted mb-0">
            Visão mensal para contabilidade e gestão, com fornecedor, chave, valores, finalidade e
            conferência rápida dos itens de cada nota.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={() => refetch().catch(() => undefined)}>
          Atualizar
        </button>
        <Link to={fiscalPaths.nfeEmitidaImportar} className="btn btn-primary">
          Importar saída
        </Link>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h6 mb-3">Filtros do relatório</h2>
          <div className="row g-3">
            <div className="col-md-6 col-lg-2">
              <label className="form-label" htmlFor="relatorio-tipo">
                Movimento
              </label>
              <select
                id="relatorio-tipo"
                className="form-select"
                value={filtros.tipo_movimento ?? 'ENTRADA'}
                onChange={onFiltroChange('tipo_movimento')}
              >
                <option value="ENTRADA">Entradas</option>
                <option value="SAIDA">Saídas</option>
                <option value="TODOS">Todos</option>
              </select>
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label" htmlFor="relatorio-inicio">
                De
              </label>
              <input
                id="relatorio-inicio"
                type="date"
                className="form-control"
                value={filtros.data_inicio ?? ''}
                onChange={onFiltroChange('data_inicio')}
              />
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label" htmlFor="relatorio-fim">
                Até
              </label>
              <input
                id="relatorio-fim"
                type="date"
                className="form-control"
                value={filtros.data_fim ?? ''}
                onChange={onFiltroChange('data_fim')}
              />
            </div>
            <div className="col-md-auto d-flex align-items-end">
              <button type="button" className="btn btn-outline-secondary" onClick={limparPeriodo}>
                Ver todo período
              </button>
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="relatorio-objetivo">
                Finalidade
              </label>
              <select
                id="relatorio-objetivo"
                className="form-select"
                value={
                  filtros.tipo_movimento === 'SAIDA'
                    ? filtros.objetivo_saida ?? ''
                    : filtros.objetivo_entrada ?? ''
                }
                onChange={
                  filtros.tipo_movimento === 'SAIDA'
                    ? onFiltroChange('objetivo_saida')
                    : onFiltroChange('objetivo_entrada')
                }
              >
                <option value="">Todas</option>
                {(filtros.tipo_movimento === 'SAIDA' ? objetivoSaidaOptions : objetivoEntradaOptions).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="relatorio-cnpj">
                CNPJ participante
              </label>
              <input
                id="relatorio-cnpj"
                className="form-control"
                value={
                  filtros.tipo_movimento === 'SAIDA'
                    ? filtros.cnpj_destinatario ?? ''
                    : filtros.cnpj_emitente ?? ''
                }
                placeholder="00.000.000/0000-00"
                onChange={
                  filtros.tipo_movimento === 'SAIDA'
                    ? onFiltroChange('cnpj_destinatario')
                    : onFiltroChange('cnpj_emitente')
                }
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="relatorio-fornecedor">
                Nome do participante
              </label>
              <input
                id="relatorio-fornecedor"
                type="search"
                className="form-control"
                value={filtros.tipo_movimento === 'SAIDA' ? filtros.cliente ?? '' : filtros.fornecedor ?? ''}
                placeholder="Parte da razão social do fornecedor ou cliente"
                onChange={
                  filtros.tipo_movimento === 'SAIDA'
                    ? onFiltroChange('cliente')
                    : onFiltroChange('fornecedor')
                }
              />
            </div>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Não foi possível gerar o relatório.'}
        </div>
      ) : null}

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="small text-muted">Documentos</div>
              <div className="h3 mb-0">{data?.resumo.total_documentos ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="small text-muted">Valor total</div>
              <div className="h3 mb-0">{formatMoedaBrl(data?.resumo.valor_total ?? '0')}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="small text-muted">Itens listados</div>
              <div className="h3 mb-0">{totalItens}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h6">Totais por finalidade</h2>
          {isPending ? (
            <p className="text-muted mb-0">Carregando…</p>
          ) : data?.resumo.por_objetivo.length ? (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Movimento</th>
                    <th>Finalidade</th>
                    <th className="text-end">NF-es</th>
                    <th className="text-end">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resumo.por_objetivo.map((row) => (
                    <tr key={`${row.tipo_movimento}-${row.objetivo}`}>
                      <td>{row.tipo_movimento === 'SAIDA' ? 'Saída' : 'Entrada'}</td>
                      <td>{labelObjetivoResumo(row)}</td>
                      <td className="text-end">{row.total_documentos}</td>
                      <td className="text-end">{formatMoedaBrl(row.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted mb-0">Nenhum total para o período.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {isPending ? <p className="text-muted p-3 mb-0">Carregando documentos…</p> : null}
          {!isPending && documentos.length === 0 ? (
            <p className="text-muted p-3 mb-0">Nenhuma NF-e encontrada para estes filtros.</p>
          ) : null}
          {!isPending && documentos.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Documento</th>
                    <th>Participante</th>
                    <th>Emissão</th>
                    <th>Finalidade</th>
                    <th>Chave</th>
                    <th className="text-end">Valor</th>
                    <th>Itens</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => {
                    const docKey = `${doc.tipo_movimento}-${doc.id}`
                    return (
                    <Fragment key={docKey}>
                      <tr>
                        <td>
                          <div className="fw-semibold">
                            {doc.numero || '—'}
                            {doc.serie ? ` / ${doc.serie}` : ''}
                          </div>
                          <div className="small text-muted">
                            {doc.tipo_movimento === 'SAIDA'
                              ? labelTipoDocumentoEmitido(doc.tipo_documento)
                              : 'NF-e recebida'}
                          </div>
                        </td>
                        <td>
                          <div className="text-break">{doc.participante_nome || '—'}</div>
                          <div className="small text-muted">{formatCnpjExibicao(doc.participante_cnpj || '')}</div>
                        </td>
                        <td>{formatDataIso(doc.data_emissao)}</td>
                        <td className="small">{labelObjetivoRelatorio(doc)}</td>
                        <td className="font-monospace small text-break" style={{ minWidth: '16rem' }}>
                          {doc.chave_acesso ? formatChaveAcesso(doc.chave_acesso) : doc.tipo_documento}
                        </td>
                        <td className="text-end">{formatMoedaBrl(doc.valor_total)}</td>
                        <td className="small text-break" style={{ minWidth: '18rem' }}>
                          {itensResumo(doc)}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() =>
                                setItensAbertos((prev) => ({ ...prev, [docKey]: !prev[docKey] }))
                              }
                            >
                              {itensAbertos[docKey] ? 'Ocultar itens' : 'Ver itens'}
                            </button>
                            {doc.tipo_movimento === 'ENTRADA' ? (
                              <Link to={fiscalPaths.nfeDetalhe(doc.id)} className="btn btn-outline-primary">
                                Abrir
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {itensAbertos[docKey] ? (
                        <tr key={`${docKey}-itens`}>
                          <td colSpan={8} className="bg-light">
                            {doc.itens.length ? (
                              <div className="table-responsive">
                                <table className="table table-sm mb-0">
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Código</th>
                                      <th>Descrição</th>
                                      <th>NCM</th>
                                      <th>CFOP</th>
                                      <th className="text-end">Qtd</th>
                                      <th className="text-end">Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {doc.itens.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.numero_item}</td>
                                        <td>{item.codigo_fornecedor || item.codigo || '—'}</td>
                                        <td className="text-break">{item.descricao}</td>
                                        <td>{item.ncm || '—'}</td>
                                        <td>{item.cfop || '—'}</td>
                                        <td className="text-end">{formatQuantidade(item.quantidade)}</td>
                                        <td className="text-end">{formatMoedaBrl(item.valor_total)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-muted mb-0">Nenhum item parseado nesta NF-e.</p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
