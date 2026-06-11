import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'

import { labelObjetivoSaida, objetivoSaidaOptions } from '../constants/objetivoSaidaOptions'
import { fiscalPaths } from '../fiscalPaths'
import { useNfesEmitidasListQuery } from '../hooks/useNfesEmitidasListQuery'
import type { NfesEmitidasFiltros } from '../types/documentoFiscalRecebido'
import {
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelAnexoSimples,
} from '../utils/fiscalDisplay'

const FILTROS_VAZIOS: NfesEmitidasFiltros = {
  tipo_documento: '',
  objetivo_saida: '',
  cfop: '',
  anexo_simples: '',
  incluir_faturamento: '',
  cnpj_destinatario: '',
  cliente: '',
  numero: '',
}

/** Lista de NF-es/NFS-es emitidas com classificação CFOP / anexo Simples. */
export default function NfesEmitidasListPage() {
  const [filtrosInput, setFiltrosInput] = useState<NfesEmitidasFiltros>(FILTROS_VAZIOS)
  const [filtrosDebounced, setFiltrosDebounced] = useState<NfesEmitidasFiltros>(FILTROS_VAZIOS)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const pageSize = 50

  useEffect(() => {
    const t = globalThis.setTimeout(() => setFiltrosDebounced(filtrosInput), 400)
    return () => globalThis.clearTimeout(t)
  }, [filtrosInput])

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtrosDebounced])

  const { data: pageData, isPending, isError, error, refetch } = useNfesEmitidasListQuery(
    filtrosDebounced,
    paginaAtual,
    pageSize,
  )

  const items = pageData?.items ?? []

  const onFiltroChange = useCallback(
    (field: keyof NfesEmitidasFiltros) =>
      (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.value
        setFiltrosInput((prev) => ({
          ...prev,
          [field]: field === 'cnpj_destinatario' ? aplicarMascaraCnpj(value) : value,
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
                NF-es emitidas
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-1">NF-es emitidas</h1>
          <p className="text-muted mb-0">
            Documentos de saída importados para faturamento e projeção de DAS (classificação por
            CFOP).
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to={fiscalPaths.nfeEmitidaImportar} className="btn btn-primary">
            Importar XMLs
          </Link>
          <Link to={fiscalPaths.projecaoDas} className="btn btn-outline-primary">
            Projeção DAS
          </Link>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => refetch().catch(() => undefined)}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h6 mb-3">Filtros</h2>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label" htmlFor="filtro-numero-emitida">
                Número
              </label>
              <input
                id="filtro-numero-emitida"
                className="form-control"
                value={filtrosInput.numero ?? ''}
                onChange={onFiltroChange('numero')}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="filtro-cfop">
                CFOP predominante
              </label>
              <input
                id="filtro-cfop"
                className="form-control"
                value={filtrosInput.cfop ?? ''}
                onChange={onFiltroChange('cfop')}
                placeholder="5102"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="filtro-anexo">
                Anexo Simples
              </label>
              <select
                id="filtro-anexo"
                className="form-select"
                value={filtrosInput.anexo_simples ?? ''}
                onChange={onFiltroChange('anexo_simples')}
              >
                <option value="">Todos</option>
                <option value="I">Anexo I</option>
                <option value="II">Anexo II</option>
                <option value="III">Anexo III</option>
                <option value="V">Anexo V</option>
                <option value="NENHUM">Não compõe</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="filtro-objetivo-saida">
                Finalidade
              </label>
              <select
                id="filtro-objetivo-saida"
                className="form-select"
                value={filtrosInput.objetivo_saida ?? ''}
                onChange={onFiltroChange('objetivo_saida')}
              >
                <option value="">Todas</option>
                {objetivoSaidaOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-cliente-emitida">
                Cliente
              </label>
              <input
                id="filtro-cliente-emitida"
                className="form-control"
                value={filtrosInput.cliente ?? ''}
                onChange={onFiltroChange('cliente')}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-cnpj-dest">
                CNPJ destinatário
              </label>
              <input
                id="filtro-cnpj-dest"
                className="form-control"
                value={filtrosInput.cnpj_destinatario ?? ''}
                onChange={onFiltroChange('cnpj_destinatario')}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-incluir-fat">
                Compõe faturamento
              </label>
              <select
                id="filtro-incluir-fat"
                className="form-select"
                value={filtrosInput.incluir_faturamento ?? ''}
                onChange={onFiltroChange('incluir_faturamento')}
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Erro ao carregar documentos emitidos.'}
        </div>
      ) : null}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Nº / Série</th>
                <th>Emissão</th>
                <th>Destinatário</th>
                <th>CFOP</th>
                <th>Anexo</th>
                <th>Finalidade</th>
                <th className="text-end">Valor</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={7} className="text-muted p-4">
                    Carregando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted p-4">
                    Nenhum documento emitido encontrado.{' '}
                    <Link to={fiscalPaths.nfeEmitidaImportar}>Importar XMLs</Link>
                  </td>
                </tr>
              ) : (
                items.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="fw-semibold">{doc.numero}</div>
                      <div className="small text-muted">Série {doc.serie || '—'}</div>
                    </td>
                    <td>{formatDataIso(doc.data_emissao)}</td>
                    <td>
                      <div>{doc.nome_destinatario || '—'}</div>
                      <div className="small text-muted">
                        {formatCnpjExibicao(doc.cnpj_destinatario)}
                      </div>
                    </td>
                    <td>{doc.cfop_predominante || '—'}</td>
                    <td>
                      <span
                        className={`badge ${doc.incluir_faturamento ? 'bg-primary' : 'bg-secondary'}`}
                      >
                        {labelAnexoSimples(doc.anexo_simples)}
                      </span>
                    </td>
                    <td>{labelObjetivoSaida(doc.objetivo_saida)}</td>
                    <td className="text-end">{formatMoedaBrl(doc.valor_total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pageData && pageData.total > pageSize ? (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              {pageData.total} documento(s) — página {pageData.page}
            </span>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={!pageData.hasPrevious}
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={!pageData.hasNext}
                onClick={() => setPaginaAtual((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
