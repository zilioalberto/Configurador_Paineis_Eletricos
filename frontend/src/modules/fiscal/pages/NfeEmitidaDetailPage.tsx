import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import {
  labelObjetivoSaida,
  labelTipoDocumentoEmitido,
} from '../constants/objetivoSaidaOptions'
import { fiscalPaths } from '../fiscalPaths'
import { useExcluirNfeEmitidaMutation } from '../hooks/useExcluirNfeEmitidaMutation'
import { useNfeEmitidaDetailQuery } from '../hooks/useNfeEmitidaDetailQuery'
import { atualizarClassificacaoDocumentoEmitido } from '../services/fiscalNfeService'
import {
  formatChaveAcesso,
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelAnexoSimples,
  labelOrigemImportacao,
} from '../utils/fiscalDisplay'

function nomeXml(numero: string, id: number): string {
  return `nfe-emitida-${numero || id}.xml`
}

/** Detalhe completo de NF-e/NFS-e emitida: cabeçalho, classificação, itens e XML. */
export default function NfeEmitidaDetailPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const podeEditar = hasPermission(user, PERMISSION_KEYS.FISCAL_EDITAR)
  const excluirMutation = useExcluirNfeEmitidaMutation()
  const { id: idParam } = useParams()
  const publicId = idParam ?? ''
  const validId = publicId.trim().length > 0
  const { data, isPending, isError, error, refetch } = useNfeEmitidaDetailQuery(publicId, validId)
  const [xmlAberto, setXmlAberto] = useState(false)
  const [salvandoFaturamento, setSalvandoFaturamento] = useState(false)
  const [erroFaturamento, setErroFaturamento] = useState<string | null>(null)
  const [confirmarExclusaoAberto, setConfirmarExclusaoAberto] = useState(false)

  const downloadNome = useMemo(() => {
    if (!data) return 'nfe-emitida.xml'
    return nomeXml(data.numero, data.id)
  }, [data])

  const onDownloadXml = useCallback(() => {
    if (!data?.xml_original) return
    const blob = new Blob([data.xml_original], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadNome
    a.click()
    URL.revokeObjectURL(url)
  }, [data, downloadNome])

  const onAlterarFaturamento = useCallback(
    async (novoValor: boolean) => {
      if (!data || novoValor === data.incluir_faturamento) return
      setSalvandoFaturamento(true)
      setErroFaturamento(null)
      try {
        await atualizarClassificacaoDocumentoEmitido(data.public_id, {
          incluir_faturamento: novoValor,
        })
        await refetch()
      } catch {
        setErroFaturamento('Não foi possível atualizar se a nota compõe faturamento.')
      } finally {
        setSalvandoFaturamento(false)
      }
    },
    [data, refetch],
  )

  const rotuloExclusao = useMemo(() => {
    if (!data) return 'este documento'
    const numero = data.numero || '—'
    const serie = data.serie ? ` · série ${data.serie}` : ''
    return `${labelTipoDocumentoEmitido(data.tipo_documento)} nº ${numero}${serie}`
  }, [data])

  const onConfirmarExclusao = useCallback(async () => {
    if (!data) return
    try {
      await excluirMutation.mutateAsync(data.public_id)
      setConfirmarExclusaoAberto(false)
      showToast({ variant: 'success', message: 'Documento emitido excluído com sucesso.' })
      navigate(fiscalPaths.nfesEmitidas)
    } catch (err) {
      console.error(err)
      setConfirmarExclusaoAberto(false)
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [data, excluirMutation, navigate, showToast])

  if (!validId) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">Identificador da NF-e emitida inválido.</div>
        <Link to={fiscalPaths.nfesEmitidas}>Voltar à lista</Link>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <ConfirmModal
        show={confirmarExclusaoAberto}
        title="Excluir NF-e emitida"
        message={`Deseja realmente excluir ${rotuloExclusao}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={excluirMutation.isPending}
        onCancel={() => {
          if (!excluirMutation.isPending) setConfirmarExclusaoAberto(false)
        }}
        onConfirm={() => void onConfirmarExclusao()}
      />
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.nfesEmitidas}>NF-es emitidas</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Detalhe
          </li>
        </ol>
      </nav>

      {isPending ? <p className="text-muted">Carregando…</p> : null}
      {isError ? (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Não foi possível carregar a NF-e emitida.'}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <div>
              <h1 className="h3 mb-2">
                {labelTipoDocumentoEmitido(data.tipo_documento)} {data.numero || '—'}
                {data.serie ? ` · série ${data.serie}` : ''}
              </h1>
              <p className="text-muted font-monospace small mb-2">
                {data.chave_acesso ? formatChaveAcesso(data.chave_acesso) : data.identificador}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-secondary">
                  {labelOrigemImportacao(data.origem_importacao)}
                </span>
                <span className="badge bg-info text-dark">
                  {labelObjetivoSaida(data.objetivo_saida)}
                </span>
                <span className={`badge ${data.incluir_faturamento ? 'bg-primary' : 'bg-secondary'}`}>
                  {data.incluir_faturamento ? 'Compõe faturamento' : 'Não compõe faturamento'}
                </span>
                <span className="badge bg-light text-dark border">
                  {labelAnexoSimples(data.anexo_simples)}
                </span>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {data.xml_original ? (
                <>
                  <button type="button" className="btn btn-outline-secondary" onClick={onDownloadXml}>
                    Descarregar XML
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => setXmlAberto((v) => !v)}
                  >
                    {xmlAberto ? 'Ocultar XML' : 'Ver XML'}
                  </button>
                </>
              ) : null}
              <Link to={fiscalPaths.nfesEmitidas} className="btn btn-outline-secondary">
                Voltar à lista
              </Link>
              {podeEditar ? (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setConfirmarExclusaoAberto(true)}
                >
                  Excluir
                </button>
              ) : null}
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h2 className="h6 text-muted text-uppercase">Emitente</h2>
                  <p className="mb-1 fw-semibold">{data.nome_emitente || '—'}</p>
                  <p className="mb-0 small">{formatCnpjExibicao(data.cnpj_emitente)}</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h2 className="h6 text-muted text-uppercase">Cliente / destinatário</h2>
                  <p className="mb-1 fw-semibold">{data.nome_destinatario || '—'}</p>
                  <p className="mb-0 small">{formatCnpjExibicao(data.cnpj_destinatario)}</p>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="card">
                <div className="card-body row g-3">
                  <div className="col-sm-3">
                    <div className="small text-muted">Emissão</div>
                    <div>{formatDataIso(data.data_emissao)}</div>
                  </div>
                  <div className="col-sm-3">
                    <div className="small text-muted">Valor total</div>
                    <div className="fw-semibold">{formatMoedaBrl(data.valor_total)}</div>
                  </div>
                  <div className="col-sm-3">
                    <div className="small text-muted">CFOP predominante</div>
                    <div>{data.cfop_predominante || '—'}</div>
                  </div>
                  <div className="col-sm-3">
                    <div className="small text-muted">Classificação</div>
                    <div>{data.classificacao_origem === 'AUTOMATICA' ? 'Automática' : 'Manual'}</div>
                  </div>
                  <div className="col-sm-6">
                    <div className="small text-muted">Faturamento</div>
                    <div className="form-check form-switch mt-1">
                      <input
                        id="nfe-emitida-incluir-faturamento"
                        className="form-check-input"
                        type="checkbox"
                        checked={data.incluir_faturamento}
                        disabled={salvandoFaturamento}
                        onChange={(event) => void onAlterarFaturamento(event.target.checked)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="nfe-emitida-incluir-faturamento"
                      >
                        {data.incluir_faturamento
                          ? 'Compõe faturamento'
                          : 'Não compõe faturamento'}
                      </label>
                    </div>
                    {erroFaturamento ? (
                      <div className="text-danger small mt-1" role="alert">
                        {erroFaturamento}
                      </div>
                    ) : null}
                    {salvandoFaturamento ? (
                      <div className="text-muted small mt-1">Salvando alteração…</div>
                    ) : null}
                  </div>
                  <div className="col-sm-6">
                    <div className="small text-muted">Natureza da operação</div>
                    <div>{data.natureza_operacao || '—'}</div>
                  </div>
                  <div className="col-sm-3">
                    <div className="small text-muted">Registrada em</div>
                    <div>{formatDataIso(data.criada_em)}</div>
                  </div>
                  <div className="col-sm-3">
                    <div className="small text-muted">Atualizada em</div>
                    <div>{formatDataIso(data.atualizada_em)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h2 className="h5 mb-3">Itens da nota ({data.itens.length})</h2>
          <div className="card mb-4">
            <div className="card-body p-0">
              {data.itens.length === 0 ? (
                <p className="text-muted p-3 mb-0">Nenhum item parseado.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Código</th>
                        <th scope="col">Descrição</th>
                        <th scope="col">NCM</th>
                        <th scope="col">CFOP</th>
                        <th scope="col">Un.</th>
                        <th scope="col" className="text-end">Qtd</th>
                        <th scope="col" className="text-end">Unitário</th>
                        <th scope="col" className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.itens.map((item) => (
                        <tr key={item.id}>
                          <td>{item.numero_item}</td>
                          <td className="text-break">{item.codigo || '—'}</td>
                          <td className="text-break">{item.descricao || '—'}</td>
                          <td>{item.ncm || '—'}</td>
                          <td>{item.cfop || '—'}</td>
                          <td>{item.unidade || '—'}</td>
                          <td className="text-end">{item.quantidade}</td>
                          <td className="text-end">{formatMoedaBrl(item.valor_unitario)}</td>
                          <td className="text-end">{formatMoedaBrl(item.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {xmlAberto && data.xml_original ? (
            <div className="card mb-4">
              <div className="card-header">XML original</div>
              <div className="card-body p-0">
                <pre className="mb-0 p-3 small bg-light overflow-auto" style={{ maxHeight: '28rem' }}>
                  {data.xml_original}
                </pre>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
