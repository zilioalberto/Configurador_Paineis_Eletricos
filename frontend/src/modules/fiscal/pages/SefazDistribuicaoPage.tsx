import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { useSefazDistribuicaoListQuery } from '../hooks/useSefazDistribuicaoListQuery'
import {
  sincronizarNfesSefaz,
  solicitarManifestacaoSefazDistribuicao,
  type SolicitarManifestacaoPayload,
} from '../services/fiscalNfeService'
import type {
  DocumentoSefazDistribuidoListRow,
  SefazDistribuicaoFiltros,
  StatusDocumentoSefazDistribuido,
  StatusManifestacaoDestinatario,
  TipoManifestacaoDestinatario,
} from '../types/documentoFiscalRecebido'
import {
  formatChaveAcesso,
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelStatusManifestacao,
  labelStatusSefazDistribuicao,
  labelTipoManifestacao,
  labelTipoSefazDistribuicao,
} from '../utils/fiscalDisplay'

const FILTROS_VAZIOS: SefazDistribuicaoFiltros = {
  chave_acesso: '',
  cnpj_emitente: '',
  status: '',
  manifestacao_status: '',
}

const TIPOS: { tipo: TipoManifestacaoDestinatario; label: string; variant: string }[] = [
  { tipo: 'CIENCIA', label: 'Ciência', variant: 'outline-primary' },
  { tipo: 'CONFIRMACAO', label: 'Confirmar', variant: 'primary' },
  { tipo: 'DESCONHECIMENTO', label: 'Desconhecer', variant: 'outline-secondary' },
  { tipo: 'NAO_REALIZADA', label: 'Não realizada', variant: 'outline-warning' },
]

function badgeStatusClass(status: StatusDocumentoSefazDistribuido): string {
  switch (status) {
    case 'XML_IMPORTADO':
      return 'bg-success'
    case 'MANIFESTADO':
      return 'bg-primary'
    case 'AGUARDANDO_MANIFESTACAO':
      return 'bg-warning text-dark'
    case 'ERRO':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

function badgeManifestacaoClass(status: StatusManifestacaoDestinatario): string {
  switch (status) {
    case 'MANIFESTADA':
      return 'bg-success'
    case 'PENDENTE':
      return 'bg-warning text-dark'
    case 'ERRO':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

function situacaoNfeLabel(codigo: string): string {
  if (codigo === '1') return 'Autorizada'
  if (codigo === '2') return 'Denegada'
  if (codigo === '3') return 'Cancelada'
  return codigo || '—'
}

type ManifestacaoState = {
  readonly documentoId: number
  readonly tipo: TipoManifestacaoDestinatario
}

function resumoPaginacao(total: number, page: number, pageSize: number, count: number): string {
  if (total <= 0) return 'Nenhum documento'
  const inicio = (page - 1) * pageSize + 1
  const fim = inicio + count - 1
  return `${inicio}-${fim} de ${total}`
}

export default function SefazDistribuicaoPage() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [filtrosInput, setFiltrosInput] = useState<SefazDistribuicaoFiltros>(FILTROS_VAZIOS)
  const [filtrosDebounced, setFiltrosDebounced] = useState<SefazDistribuicaoFiltros>(FILTROS_VAZIOS)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [manifestacao, setManifestacao] = useState<ManifestacaoState | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const pageSize = 50

  useEffect(() => {
    const t = globalThis.setTimeout(() => setFiltrosDebounced(filtrosInput), 400)
    return () => globalThis.clearTimeout(t)
  }, [filtrosInput])

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtrosDebounced])

  const { data: pageData, isPending, isError, error, refetch } = useSefazDistribuicaoListQuery(
    filtrosDebounced,
    paginaAtual,
    pageSize,
  )

  const items = pageData?.items ?? []

  const mutation = useMutation({
    mutationFn: ({ documentoId, payload }: { documentoId: number; payload: SolicitarManifestacaoPayload }) =>
      solicitarManifestacaoSefazDistribuicao(documentoId, payload),
    onSuccess: (res) => {
      showToast({ variant: 'success', message: res.message })
      queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all }).catch(() => undefined)
      setManifestacao(null)
      setJustificativa('')
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        message: extrairMensagemErroApi(err) || 'Não foi possível solicitar a manifestação.',
      })
    },
  })

  const syncMutation = useMutation({
    mutationFn: sincronizarNfesSefaz,
    onSuccess: (res) => {
      const partes = [
        res.mensagem,
        `${res.resumos_novos ?? 0} resumo(s) novo(s)`,
        `${res.documentos_novos} NF-e(s) importada(s)`,
      ]
      if (res.ultimo_cstat) {
        partes.push(`cStat ${res.ultimo_cstat}`)
      }
      showToast({ variant: res.sucesso ? 'success' : 'warning', message: partes.join(' · ') })
      queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all }).catch(() => undefined)
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        message: extrairMensagemErroApi(err) || 'Não foi possível consultar a SEFAZ.',
      })
    },
  })

  const onFiltroChange = useCallback(
    (field: keyof SefazDistribuicaoFiltros) =>
      (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.value
        setFiltrosInput((prev) => ({
          ...prev,
          [field]: field === 'cnpj_emitente' ? aplicarMascaraCnpj(value) : value,
        }))
      },
    [],
  )

  const solicitar = useCallback(
    (documentoId: number, tipo: TipoManifestacaoDestinatario) => {
      if (tipo === 'NAO_REALIZADA') {
        setManifestacao({ documentoId, tipo })
        if (justificativa.trim().length < 15) {
          showToast({
            variant: 'danger',
            message: 'Informe a justificativa (mínimo 15 caracteres).',
          })
          return
        }
      }
      mutation.mutate({
        documentoId,
        payload: {
          tipo,
          justificativa: tipo === 'NAO_REALIZADA' ? justificativa : undefined,
        },
      })
    },
    [justificativa, mutation, showToast],
  )

  const renderAcoes = (doc: DocumentoSefazDistribuidoListRow) => {
    const bloqueado =
      mutation.isPending ||
      doc.manifestacao_status === 'PENDENTE' ||
      doc.status === 'XML_IMPORTADO'

    if (doc.status === 'XML_IMPORTADO' && doc.documento_recebido_id) {
      return (
        <Link to={fiscalPaths.nfeDetalhe(doc.documento_recebido_id)} className="btn btn-sm btn-outline-success">
          Abrir NF-e
        </Link>
      )
    }

    return (
      <div className="d-flex flex-wrap gap-1">
        {TIPOS.map((item) => (
          <button
            key={item.tipo}
            type="button"
            className={`btn btn-sm btn-${item.variant}`}
            disabled={bloqueado}
            onClick={() => {
              if (item.tipo === 'NAO_REALIZADA' && manifestacao?.documentoId !== doc.id) {
                setManifestacao({ documentoId: doc.id, tipo: item.tipo })
                return
              }
              solicitar(doc.id, item.tipo)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    )
  }

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
                Caixa SEFAZ
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-1">Caixa de Entrada SEFAZ</h1>
          <p className="text-muted mb-0">
            Resumos e documentos descobertos pela Distribuição DFe antes da importação do XML completo.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {syncMutation.isPending ? 'Consultando...' : 'Buscar XMLs na SEFAZ'}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => refetch().catch(() => undefined)}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h6 mb-3">Filtros</h2>
          <div className="row g-3">
            <div className="col-lg-5">
              <label className="form-label" htmlFor="sefaz-chave">
                Chave de acesso
              </label>
              <input
                id="sefaz-chave"
                type="search"
                className="form-control"
                value={filtrosInput.chave_acesso ?? ''}
                onChange={onFiltroChange('chave_acesso')}
                placeholder="44 dígitos"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="sefaz-emitente">
                CNPJ emitente
              </label>
              <input
                id="sefaz-emitente"
                type="search"
                className="form-control"
                value={filtrosInput.cnpj_emitente ?? ''}
                onChange={onFiltroChange('cnpj_emitente')}
                placeholder="00.000.000/0000-00"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label" htmlFor="sefaz-status">
                Status
              </label>
              <select
                id="sefaz-status"
                className="form-select"
                value={filtrosInput.status ?? ''}
                onChange={onFiltroChange('status')}
              >
                <option value="">Todos</option>
                <option value="RESUMO_RECEBIDO">Resumo recebido</option>
                <option value="AGUARDANDO_MANIFESTACAO">Aguardando manifestação</option>
                <option value="MANIFESTADO">Manifestado</option>
                <option value="XML_IMPORTADO">XML importado</option>
                <option value="ERRO">Erro</option>
              </select>
            </div>
            <div className="col-md-6 col-lg-2">
              <label className="form-label" htmlFor="sefaz-manifestacao">
                Manifestação
              </label>
              <select
                id="sefaz-manifestacao"
                className="form-select"
                value={filtrosInput.manifestacao_status ?? ''}
                onChange={onFiltroChange('manifestacao_status')}
              >
                <option value="">Todas</option>
                <option value="NAO_SOLICITADA">Não solicitada</option>
                <option value="PENDENTE">Pendente</option>
                <option value="MANIFESTADA">Registrada</option>
                <option value="ERRO">Erro</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {manifestacao?.tipo === 'NAO_REALIZADA' ? (
        <div className="alert alert-warning">
          <label className="form-label" htmlFor="sefaz-justificativa">
            Justificativa para operação não realizada
          </label>
          <textarea
            id="sefaz-justificativa"
            className="form-control"
            rows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Mínimo 15 caracteres"
          />
          <div className="d-flex gap-2 mt-2">
            <button
              type="button"
              className="btn btn-sm btn-warning"
              disabled={mutation.isPending || justificativa.trim().length < 15}
              onClick={() => solicitar(manifestacao.documentoId, 'NAO_REALIZADA')}
            >
              Enviar manifestação
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setManifestacao(null)
                setJustificativa('')
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h2 className="h6 mb-0">Documentos distribuídos</h2>
          <span className="text-muted small">
            {resumoPaginacao(pageData?.total ?? 0, paginaAtual, pageSize, items.length)}
          </span>
        </div>

        {isPending ? (
          <div className="card-body text-muted">Carregando documentos...</div>
        ) : null}

        {isError ? (
          <div className="card-body">
            <div className="alert alert-danger mb-0" role="alert">
              {error instanceof Error ? error.message : 'Não foi possível carregar a caixa SEFAZ.'}
            </div>
          </div>
        ) : null}

        {!isPending && !isError && items.length === 0 ? (
          <div className="card-body text-muted">Nenhum resumo SEFAZ encontrado.</div>
        ) : null}

        {!isPending && !isError && items.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Emitente</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Manifestação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="fw-semibold">{labelTipoSefazDistribuicao(doc.tipo_documento)}</div>
                      <div className="small font-monospace">{formatChaveAcesso(doc.chave_acesso)}</div>
                      <div className="small text-muted">
                        NSU {doc.nsu || '—'} · {doc.schema || 'sem schema'}
                      </div>
                    </td>
                    <td>
                      <div>{doc.nome_emitente || '—'}</div>
                      <div className="small text-muted">{formatCnpjExibicao(doc.cnpj_emitente)}</div>
                      <div className="small text-muted">{formatDataIso(doc.data_emissao)}</div>
                    </td>
                    <td>
                      <div>{formatMoedaBrl(doc.valor_total)}</div>
                      <div className="small text-muted">{situacaoNfeLabel(doc.situacao_nfe)}</div>
                    </td>
                    <td>
                      <span className={`badge ${badgeStatusClass(doc.status)}`}>
                        {labelStatusSefazDistribuicao(doc.status)}
                      </span>
                      {doc.ultimo_erro ? <div className="small text-danger mt-1">{doc.ultimo_erro}</div> : null}
                    </td>
                    <td>
                      <span className={`badge ${badgeManifestacaoClass(doc.manifestacao_status)}`}>
                        {labelStatusManifestacao(doc.manifestacao_status)}
                      </span>
                      <div className="small text-muted mt-1">
                        {labelTipoManifestacao(doc.manifestacao_tipo)}
                      </div>
                      {doc.manifestacao_cstat ? (
                        <div className="small text-muted">
                          {doc.manifestacao_cstat}
                          {doc.manifestacao_motivo ? ` — ${doc.manifestacao_motivo}` : ''}
                        </div>
                      ) : null}
                    </td>
                    <td>{renderAcoes(doc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pageData && pageData.total > pageSize ? (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!pageData.hasPrevious}
              onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <span className="small text-muted">Página {paginaAtual}</span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!pageData.hasNext}
              onClick={() => setPaginaAtual((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
