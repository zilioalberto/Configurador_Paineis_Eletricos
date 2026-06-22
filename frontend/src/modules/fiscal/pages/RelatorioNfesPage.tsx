import { type ChangeEvent, useMemo, useState } from 'react'
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
import { competenciaAtualLocal, periodoDaCompetencia } from '../utils/periodoCompetencia'

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
  competencia: competenciaAtualLocal(),
  objetivo_entrada: '',
  objetivo_saida: '',
  cnpj_emitente: '',
  cnpj_destinatario: '',
  fornecedor: '',
  cliente: '',
  ...(periodoDaCompetencia(competenciaAtualLocal()) ?? {}),
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

function valorFiltro(field: keyof RelatorioNFeFiltros, value: string) {
  if (field === 'cnpj_emitente' || field === 'cnpj_destinatario') return aplicarMascaraCnpj(value)
  if (field === 'tipo_movimento') return value as TipoMovimentoRelatorioNFe
  return value
}

function RelatorioFiltros({
  filtros,
  onFiltroChange,
  onCompetenciaChange,
  onLimparPeriodo,
}: Readonly<{
  filtros: RelatorioNFeFiltros
  onFiltroChange: (
    field: keyof RelatorioNFeFiltros
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onCompetenciaChange: (event: ChangeEvent<HTMLInputElement>) => void
  onLimparPeriodo: () => void
}>) {
  const saida = filtros.tipo_movimento === 'SAIDA'
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h2 className="h6 mb-3">Filtros do relatório</h2>
        <div className="row g-3">
          <div className="col-md-6 col-lg-2">
            <label className="form-label" htmlFor="relatorio-tipo">Movimento</label>
            <select id="relatorio-tipo" className="form-select" value={filtros.tipo_movimento ?? 'ENTRADA'} onChange={onFiltroChange('tipo_movimento')}>
              <option value="ENTRADA">Entradas</option>
              <option value="SAIDA">Saídas</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>
          <div className="col-md-6 col-lg-2">
            <label className="form-label" htmlFor="relatorio-competencia">Competência</label>
            <input id="relatorio-competencia" type="month" className="form-control" value={filtros.competencia ?? ''} onChange={onCompetenciaChange} />
          </div>
          <div className="col-md-6 col-lg-2">
            <label className="form-label" htmlFor="relatorio-inicio">De</label>
            <input id="relatorio-inicio" type="date" className="form-control" value={filtros.data_inicio ?? ''} onChange={onFiltroChange('data_inicio')} />
          </div>
          <div className="col-md-6 col-lg-2">
            <label className="form-label" htmlFor="relatorio-fim">Até</label>
            <input id="relatorio-fim" type="date" className="form-control" value={filtros.data_fim ?? ''} onChange={onFiltroChange('data_fim')} />
          </div>
          <div className="col-md-auto d-flex align-items-end">
            <button type="button" className="btn btn-outline-secondary" onClick={onLimparPeriodo}>Ver todo período</button>
          </div>
          <div className="col-md-6 col-lg-3">
            <label className="form-label" htmlFor="relatorio-objetivo">Finalidade</label>
            <select id="relatorio-objetivo" className="form-select" value={saida ? filtros.objetivo_saida ?? '' : filtros.objetivo_entrada ?? ''} onChange={saida ? onFiltroChange('objetivo_saida') : onFiltroChange('objetivo_entrada')}>
              <option value="">Todas</option>
              {(saida ? objetivoSaidaOptions : objetivoEntradaOptions).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6 col-lg-3">
            <label className="form-label" htmlFor="relatorio-cnpj">CNPJ participante</label>
            <input id="relatorio-cnpj" className="form-control" value={saida ? filtros.cnpj_destinatario ?? '' : filtros.cnpj_emitente ?? ''} placeholder="00.000.000/0000-00" onChange={saida ? onFiltroChange('cnpj_destinatario') : onFiltroChange('cnpj_emitente')} />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="relatorio-fornecedor">Nome do participante</label>
            <input id="relatorio-fornecedor" type="search" className="form-control" value={saida ? filtros.cliente ?? '' : filtros.fornecedor ?? ''} placeholder="Parte da razão social do fornecedor ou cliente" onChange={saida ? onFiltroChange('cliente') : onFiltroChange('fornecedor')} />
          </div>
        </div>
      </div>
    </div>
  )
}

function RelatorioResumoCards({ documentos, valorTotal, totalItens }: Readonly<{
  documentos: number
  valorTotal: string
  totalItens: number
}>) {
  return (
    <div className="row g-3 mb-3">
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="small text-muted">Documentos</div><div className="h3 mb-0">{documentos}</div></div></div></div>
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="small text-muted">Valor total</div><div className="h3 mb-0">{formatMoedaBrl(valorTotal)}</div></div></div></div>
      <div className="col-md-4"><div className="card h-100"><div className="card-body"><div className="small text-muted">Itens listados</div><div className="h3 mb-0">{totalItens}</div></div></div></div>
    </div>
  )
}

function TotaisObjetivoCard({
  isPending,
  rows,
}: Readonly<{
  isPending: boolean
  rows: Array<{ tipo_movimento: 'ENTRADA' | 'SAIDA'; objetivo: string; total_documentos: number; valor_total: string }>
}>) {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h2 className="h6">Totais por finalidade</h2>
        {isPending ? (
          <p className="text-muted mb-0">Carregando…</p>
        ) : rows.length ? (
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
                {rows.map((row) => (
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
  )
}

function DocumentoRow({
  doc,
  aberto,
  onToggle,
}: Readonly<{
  doc: RelatorioNFeDocumentoRow
  aberto: boolean
  onToggle: () => void
}>) {
  return (
    <>
      <tr>
        <td>
          <div className="fw-semibold">{doc.numero || '—'}{doc.serie ? ` / ${doc.serie}` : ''}</div>
          <div className="small text-muted">{doc.tipo_movimento === 'SAIDA' ? labelTipoDocumentoEmitido(doc.tipo_documento) : 'NF-e recebida'}</div>
        </td>
        <td>
          <div className="text-break">{doc.participante_nome || '—'}</div>
          <div className="small text-muted">{formatCnpjExibicao(doc.participante_cnpj || '')}</div>
        </td>
        <td>{formatDataIso(doc.data_emissao)}</td>
        <td className="small">{labelObjetivoRelatorio(doc)}</td>
        <td className="font-monospace small text-break" style={{ minWidth: '16rem' }}>{doc.chave_acesso ? formatChaveAcesso(doc.chave_acesso) : doc.tipo_documento}</td>
        <td className="text-end">{formatMoedaBrl(doc.valor_total)}</td>
        <td className="small text-break" style={{ minWidth: '18rem' }}>{itensResumo(doc)}</td>
        <td className="text-end">
          <div className="btn-group btn-group-sm">
            <button type="button" className="btn btn-outline-secondary" onClick={onToggle}>
              {aberto ? 'Ocultar itens' : 'Ver itens'}
            </button>
            {doc.tipo_movimento === 'ENTRADA' ? (
              <Link to={fiscalPaths.nfeDetalhe(doc.id)} className="btn btn-outline-primary">Abrir</Link>
            ) : null}
          </div>
        </td>
      </tr>
      {aberto ? <DocumentoItensRow doc={doc} /> : null}
    </>
  )
}

function DocumentoItensRow({ doc }: Readonly<{ doc: RelatorioNFeDocumentoRow }>) {
  return (
    <tr>
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
  )
}

function DocumentosCard({
  documentos,
  isPending,
  itensAbertos,
  onToggleItens,
}: Readonly<{
  documentos: RelatorioNFeDocumentoRow[]
  isPending: boolean
  itensAbertos: Record<string, boolean>
  onToggleItens: (docKey: string) => void
}>) {
  return (
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
                    <DocumentoRow
                      key={docKey}
                      doc={doc}
                      aberto={Boolean(itensAbertos[docKey])}
                      onToggle={() => onToggleItens(docKey)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Relatório contábil/gerencial de NF-es com totais e expansão rápida de itens. */
export default function RelatorioNfesPage() {
  const [filtros, setFiltros] = useState<RelatorioNFeFiltros>(FILTROS_INICIAIS)
  const [itensAbertos, setItensAbertos] = useState<Record<string, boolean>>({})
  const { data, isPending, isError, error, refetch } = useRelatorioNfesQuery(filtros)

  const documentosData = data?.documentos
  const documentos = useMemo(() => documentosData ?? [], [documentosData])
  const totalItens = useMemo(
    () => documentos.reduce((acc, doc) => acc + doc.itens.length, 0),
    [documentos],
  )

  const onFiltroChange =
    (field: keyof RelatorioNFeFiltros) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFiltros((prev) => ({
        ...prev,
        [field]: valorFiltro(field, event.target.value),
        ...(field === 'data_inicio' || field === 'data_fim' ? { competencia: '' } : {}),
      }))
    }

  const onCompetenciaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const competencia = event.target.value
    const periodo = periodoDaCompetencia(competencia)
    setFiltros((prev) => ({
      ...prev,
      competencia,
      ...(periodo ?? { data_inicio: '', data_fim: '' }),
    }))
  }

  const limparPeriodo = () => {
    setFiltros((prev) => ({ ...prev, competencia: '', data_inicio: '', data_fim: '' }))
  }

  const toggleItens = (docKey: string) => {
    setItensAbertos((prev) => ({ ...prev, [docKey]: !prev[docKey] }))
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

      <RelatorioFiltros
        filtros={filtros}
        onFiltroChange={onFiltroChange}
        onCompetenciaChange={onCompetenciaChange}
        onLimparPeriodo={limparPeriodo}
      />

      {isError ? (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Não foi possível gerar o relatório.'}
        </div>
      ) : null}

      <RelatorioResumoCards
        documentos={data?.resumo.total_documentos ?? 0}
        valorTotal={data?.resumo.valor_total ?? '0'}
        totalItens={totalItens}
      />
      <TotaisObjetivoCard isPending={isPending} rows={data?.resumo.por_objetivo ?? []} />
      <DocumentosCard
        documentos={documentos}
        isPending={isPending}
        itensAbertos={itensAbertos}
        onToggleItens={toggleItens}
      />
    </div>
  )
}
