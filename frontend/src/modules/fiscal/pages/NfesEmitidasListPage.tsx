import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmModal, useToast } from '@/components/feedback'
import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import SortableTableHeader from '../components/SortableTableHeader'
import { labelObjetivoSaida, objetivoSaidaOptions } from '../constants/objetivoSaidaOptions'
import { fiscalPaths } from '../fiscalPaths'
import { useExcluirNfeEmitidaMutation } from '../hooks/useExcluirNfeEmitidaMutation'
import { useNfesEmitidasListQuery } from '../hooks/useNfesEmitidasListQuery'
import type { NfesEmitidasFiltros } from '../types/documentoFiscalRecebido'
import {
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelAnexoSimples,
  labelIncluirFaturamento,
} from '../utils/fiscalDisplay'
import {
  DEFAULT_NFES_EMITIDAS_ORDERING,
  proximaOrdenacaoEmitidas,
  type NfesEmitidasOrdenacaoCampo,
} from '../utils/nfesEmitidasOrdering'

const FILTROS_VAZIOS: NfesEmitidasFiltros = {
  tipo_documento: '',
  competencia: '',
  objetivo_saida: '',
  cfop: '',
  anexo_simples: '',
  incluir_faturamento: '',
  cnpj_destinatario: '',
  cliente: '',
  numero: '',
}

type ExcluirAlvo = {
  readonly publicId: string
  readonly label: string
}

/** Lista de NF-es/NFS-es emitidas com classificação CFOP / anexo Simples. */
export default function NfesEmitidasListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const podeEditar = hasPermission(user, PERMISSION_KEYS.FISCAL_EDITAR)
  const excluirMutation = useExcluirNfeEmitidaMutation()
  const [excluirAlvo, setExcluirAlvo] = useState<ExcluirAlvo | null>(null)
  const [filtrosInput, setFiltrosInput] = useState<NfesEmitidasFiltros>(FILTROS_VAZIOS)
  const [filtrosDebounced, setFiltrosDebounced] = useState<NfesEmitidasFiltros>(FILTROS_VAZIOS)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [ordering, setOrdering] = useState(DEFAULT_NFES_EMITIDAS_ORDERING)
  const pageSize = 50

  useEffect(() => {
    const t = globalThis.setTimeout(() => setFiltrosDebounced(filtrosInput), 400)
    return () => globalThis.clearTimeout(t)
  }, [filtrosInput])

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtrosDebounced, ordering])

  const { data: pageData, isPending, isError, error, refetch } = useNfesEmitidasListQuery(
    filtrosDebounced,
    paginaAtual,
    pageSize,
    ordering,
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

  const onSortColumn = useCallback((field: NfesEmitidasOrdenacaoCampo) => {
    setOrdering((atual) => proximaOrdenacaoEmitidas(field, atual))
  }, [])

  const onSolicitarExclusao = useCallback(
    (publicId: string, numero: string, serie: string) => {
      const sufixoSerie = serie ? ` · série ${serie}` : ''
      const rotulo = numero ? `NF-e/NFS-e nº ${numero}${sufixoSerie}` : 'este documento'
      setExcluirAlvo({ publicId, label: rotulo })
    },
    [],
  )

  const fecharModalExclusao = useCallback(() => {
    if (!excluirMutation.isPending) setExcluirAlvo(null)
  }, [excluirMutation.isPending])

  const confirmarExclusao = useCallback(async () => {
    if (!excluirAlvo) return
    try {
      await excluirMutation.mutateAsync(excluirAlvo.publicId)
      setExcluirAlvo(null)
      showToast({ variant: 'success', message: 'Documento emitido excluído com sucesso.' })
    } catch (err) {
      console.error(err)
      setExcluirAlvo(null)
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [excluirAlvo, excluirMutation, showToast])

  const colSpanTabela = podeEditar ? 9 : 8

  return (
    <div className="container-fluid">
      <ConfirmModal
        show={excluirAlvo !== null}
        title="Excluir NF-e emitida"
        message={
          excluirAlvo
            ? `Deseja realmente excluir ${excluirAlvo.label}? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={excluirMutation.isPending}
        onCancel={fecharModalExclusao}
        onConfirm={() => void confirmarExclusao()}
      />
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
              <label className="form-label" htmlFor="filtro-competencia-emitida">
                Competência
              </label>
              <input
                id="filtro-competencia-emitida"
                type="month"
                className="form-control"
                value={filtrosInput.competencia ?? ''}
                onChange={onFiltroChange('competencia')}
              />
            </div>
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
                <SortableTableHeader
                  label="Nº / Série"
                  field="serie"
                  ordering={ordering}
                  onSort={onSortColumn}
                />
                <SortableTableHeader
                  label="Emissão"
                  field="data_emissao"
                  ordering={ordering}
                  onSort={onSortColumn}
                />
                <SortableTableHeader
                  label="Destinatário"
                  field="nome_destinatario"
                  ordering={ordering}
                  onSort={onSortColumn}
                />
                <th>CFOP</th>
                <th>Anexo</th>
                <th>Compõe faturamento</th>
                <th>Finalidade</th>
                <th className="text-end">Valor</th>
                {podeEditar ? <th className="text-end">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={colSpanTabela} className="text-muted p-4">
                    Carregando…
                  </td>
                </tr>
              ) : null}
              {!isPending && items.length === 0 ? (
                <tr>
                  <td colSpan={colSpanTabela} className="text-muted p-4">
                    Nenhum documento emitido encontrado.{' '}
                    <Link to={fiscalPaths.nfeEmitidaImportar}>Importar XMLs</Link>
                  </td>
                </tr>
              ) : null}
              {!isPending && items.length > 0
                ? items.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link
                        to={fiscalPaths.nfeEmitidaDetalhe(doc.public_id)}
                        className="fw-semibold text-decoration-none"
                      >
                        {doc.numero || '—'}
                      </Link>
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
                      <span className="badge bg-light text-dark border">
                        {labelAnexoSimples(doc.anexo_simples)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${doc.incluir_faturamento ? 'bg-primary' : 'bg-secondary'}`}
                        title={labelIncluirFaturamento(doc.incluir_faturamento)}
                      >
                        {doc.incluir_faturamento ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td>{labelObjetivoSaida(doc.objetivo_saida)}</td>
                    <td className="text-end">{formatMoedaBrl(doc.valor_total)}</td>
                    {podeEditar ? (
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            onSolicitarExclusao(doc.public_id, doc.numero, doc.serie)
                          }
                        >
                          Excluir
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
                : null}
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
