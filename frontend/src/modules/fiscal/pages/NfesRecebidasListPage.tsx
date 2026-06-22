import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'

import { fiscalPaths } from '../fiscalPaths'
import { objetivoEntradaOptions, labelObjetivoEntrada } from '../constants/objetivoEntradaOptions'
import { useNfesRecebidasListQuery } from '../hooks/useNfesRecebidasListQuery'
import type {
  NfesRecebidasFiltros,
  ObjetivoEntradaFiscal,
  OrigemImportacaoFiscal,
  StatusImportacaoFiscal,
} from '../types/documentoFiscalRecebido'
import {
  formatChaveAcesso,
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelOrigemImportacao,
  labelStatusImportacao,
} from '../utils/fiscalDisplay'

const FILTROS_VAZIOS: NfesRecebidasFiltros = {
  chave_acesso: '',
  cnpj_emitente: '',
  cnpj_destinatario: '',
  numero: '',
  serie: '',
  status_importacao: '',
  origem_importacao: '',
  objetivo_entrada: '',
}

function badgeStatusClass(status: StatusImportacaoFiscal): string {
  switch (status) {
    case 'PROCESSADA':
      return 'bg-success'
    case 'ERRO':
      return 'bg-danger'
    case 'IGNORADA':
      return 'bg-warning text-dark'
    default:
      return 'bg-secondary'
  }
}

/** Lista paginada de NF-es recebidas armazenadas no servidor (SEFAZ / importação). */
export default function NfesRecebidasListPage() {
  const [filtrosInput, setFiltrosInput] = useState<NfesRecebidasFiltros>(FILTROS_VAZIOS)
  const [filtrosDebounced, setFiltrosDebounced] = useState<NfesRecebidasFiltros>(FILTROS_VAZIOS)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const pageSize = 50

  useEffect(() => {
    const t = globalThis.setTimeout(() => setFiltrosDebounced(filtrosInput), 400)
    return () => globalThis.clearTimeout(t)
  }, [filtrosInput])

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtrosDebounced])

  const { data: pageData, isPending, isError, error, refetch } = useNfesRecebidasListQuery(
    filtrosDebounced,
    paginaAtual,
    pageSize,
  )

  const items = pageData?.items ?? []

  const onFiltroChange = useCallback(
    (field: keyof NfesRecebidasFiltros) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value
      setFiltrosInput((prev) => ({
        ...prev,
        [field]:
          field === 'cnpj_emitente' || field === 'cnpj_destinatario'
            ? aplicarMascaraCnpj(value)
            : value,
      }))
    },
    [],
  )

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2">
              <li className="breadcrumb-item">
                <Link to={fiscalPaths.home}>Fiscal</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                NF-es recebidas
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-1">NF-es recebidas</h1>
          <p className="text-muted mb-0">
            Documentos importados da SEFAZ ou manualmente. O XML fica no servidor; a
            importação para o catálogo de produtos é um fluxo à parte.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to={fiscalPaths.nfeImportarManual} className="btn btn-primary">
            Importar XML
          </Link>
          <Link to={fiscalPaths.nfeBuscarChave} className="btn btn-outline-primary">
            Buscar por chave
          </Link>
          <button type="button" className="btn btn-outline-secondary" onClick={() => refetch().catch(() => undefined)}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h6 mb-3">Filtros</h2>
          <div className="row g-3">
            <div className="col-lg-6">
              <label className="form-label" htmlFor="nfe-filtro-chave">
                Chave de acesso
              </label>
              <input
                id="nfe-filtro-chave"
                type="search"
                className="form-control"
                value={filtrosInput.chave_acesso ?? ''}
                onChange={onFiltroChange('chave_acesso')}
                placeholder="44 dígitos"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="nfe-filtro-numero">
                Número
              </label>
              <input
                id="nfe-filtro-numero"
                type="search"
                className="form-control"
                value={filtrosInput.numero ?? ''}
                onChange={onFiltroChange('numero')}
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="nfe-filtro-serie">
                Série
              </label>
              <input
                id="nfe-filtro-serie"
                type="search"
                className="form-control"
                value={filtrosInput.serie ?? ''}
                onChange={onFiltroChange('serie')}
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="nfe-filtro-emitente">
                CNPJ emitente
              </label>
              <input
                id="nfe-filtro-emitente"
                type="search"
                className="form-control"
                value={filtrosInput.cnpj_emitente ?? ''}
                onChange={onFiltroChange('cnpj_emitente')}
                placeholder="00.000.000/0000-00"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="nfe-filtro-dest">
                CNPJ destinatário
              </label>
              <input
                id="nfe-filtro-dest"
                type="search"
                className="form-control"
                value={filtrosInput.cnpj_destinatario ?? ''}
                onChange={onFiltroChange('cnpj_destinatario')}
                placeholder="00.000.000/0000-00"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="nfe-filtro-status">
                Status
              </label>
              <select
                id="nfe-filtro-status"
                className="form-select"
                value={filtrosInput.status_importacao ?? ''}
                onChange={onFiltroChange('status_importacao')}
              >
                <option value="">Todos</option>
                <option value="RECEBIDA">Recebida</option>
                <option value="PROCESSADA">Processada</option>
                <option value="ERRO">Erro</option>
                <option value="IGNORADA">Ignorada</option>
              </select>
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="nfe-filtro-origem">
                Origem
              </label>
              <select
                id="nfe-filtro-origem"
                className="form-select"
                value={filtrosInput.origem_importacao ?? ''}
                onChange={onFiltroChange('origem_importacao')}
              >
                <option value="">Todas</option>
                <option value="MANUAL">Manual (portal)</option>
                <option value="SEFAZ_SYNC">Sincronização SEFAZ</option>
                <option value="API">API</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="nfe-filtro-objetivo">
                Objetivo da entrada
              </label>
              <select
                id="nfe-filtro-objetivo"
                className="form-select"
                value={filtrosInput.objetivo_entrada ?? ''}
                onChange={onFiltroChange('objetivo_entrada')}
              >
                <option value="">Todos</option>
                {objetivoEntradaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {isPending && <p className="text-muted p-3 mb-0">Carregando…</p>}
          {isError && (
            <div className="alert alert-danger m-3 mb-0" role="alert">
              {error instanceof Error ? error.message : 'Não foi possível carregar as NF-es.'}
            </div>
          )}
          {!isPending && !isError && items.length === 0 && (
            <p className="text-muted p-3 mb-0">Nenhuma NF-e encontrada com estes filtros.</p>
          )}
          {!isPending && !isError && items.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Nº / Série</th>
                    <th scope="col">Emitente</th>
                    <th scope="col">Emissão</th>
                    <th scope="col" className="text-end">
                      Valor
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Objetivo</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="fw-semibold">
                          {row.numero || '—'}
                          {row.serie ? ` / ${row.serie}` : ''}
                        </div>
                        <div className="small text-muted font-monospace">
                          {formatChaveAcesso(row.chave_acesso).slice(0, 24)}…
                        </div>
                      </td>
                      <td>
                        <div className="text-break">{row.nome_emitente || '—'}</div>
                        <div className="small text-muted">{formatCnpjExibicao(row.cnpj_emitente)}</div>
                      </td>
                      <td>{formatDataIso(row.data_emissao)}</td>
                      <td className="text-end">{formatMoedaBrl(row.valor_total)}</td>
                      <td>
                        <span className={`badge ${badgeStatusClass(row.status_importacao)}`}>
                          {labelStatusImportacao(row.status_importacao)}
                        </span>
                      </td>
                      <td className="small">
                        {labelOrigemImportacao(row.origem_importacao as OrigemImportacaoFiscal)}
                      </td>
                      <td className="small">
                        {labelObjetivoEntrada(row.objetivo_entrada as ObjetivoEntradaFiscal)}
                      </td>
                      <td className="text-end">
                        <Link
                          to={fiscalPaths.nfeDetalhe(row.id)}
                          className="btn btn-sm btn-outline-primary"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isPending && !isError && items.length > 0 && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top">
              <p className="small text-muted mb-0">
                {`Mostrando ${items.length} de ${pageData?.total ?? items.length} documentos`}
              </p>
              <nav className="btn-group" aria-label="Paginação">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={isPending || !pageData?.hasPrevious}
                >
                  Anterior
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                  Página {paginaAtual}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setPaginaAtual((p) => p + 1)}
                  disabled={isPending || !pageData?.hasNext}
                >
                  Próxima
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
