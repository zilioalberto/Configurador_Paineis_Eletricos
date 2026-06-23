import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { labelObjetivoEntrada } from '../constants/objetivoEntradaOptions'
import { fiscalPaths } from '../fiscalPaths'
import { useNfseRecebidaDetailQuery } from '../hooks/useNfseRecebidaDetailQuery'
import {
  formatChaveAcesso,
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelOrigemImportacao,
  labelStatusImportacao,
} from '../utils/fiscalDisplay'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Detalhe de NFS-e recebida: cabeçalho, itens e XML armazenado. */
export default function NfseRecebidaDetailPage() {
  const { id: publicIdParam } = useParams()
  const publicId = (publicIdParam ?? '').trim()
  const validId = UUID_RE.test(publicId)

  const { data, isPending, isError, error } = useNfseRecebidaDetailQuery(publicId, validId)
  const [xmlAberto, setXmlAberto] = useState(false)

  const downloadNome = useMemo(() => {
    if (!data) return 'nfse.xml'
    return `nfse-${data.numero || data.id}.xml`
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

  if (!validId) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">Identificador da NFS-e inválido.</div>
        <Link to={fiscalPaths.nfseRecebidas}>Voltar à lista</Link>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.nfseRecebidas}>NFS-es recebidas</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Detalhe
          </li>
        </ol>
      </nav>

      {isPending && <p className="text-muted">Carregando…</p>}
      {isError && (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Não foi possível carregar a NFS-e.'}
        </div>
      )}

      {data && (
        <>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <div>
              <h1 className="h3 mb-2">NFS-e {data.numero || '—'}</h1>
              {data.chave_acesso ? (
                <p className="text-muted font-monospace small mb-2">
                  {formatChaveAcesso(data.chave_acesso)}
                </p>
              ) : null}
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-secondary">
                  {labelStatusImportacao(data.status_importacao)}
                </span>
                <span className="badge bg-light text-dark border">
                  {labelOrigemImportacao(data.origem_importacao)}
                </span>
                <span className="badge bg-info text-dark">
                  {labelObjetivoEntrada(data.objetivo_entrada)}
                </span>
                {data.nsu_adn ? (
                  <span className="badge bg-light text-dark border">NSU ADN {data.nsu_adn}</span>
                ) : null}
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
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h2 className="h6 text-muted text-uppercase">Prestador</h2>
                  <p className="mb-1 fw-semibold">{data.nome_prestador || '—'}</p>
                  <p className="mb-0 small">{formatCnpjExibicao(data.cnpj_prestador)}</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h2 className="h6 text-muted text-uppercase">Tomador</h2>
                  <p className="mb-1 fw-semibold">{data.nome_tomador || '—'}</p>
                  <p className="mb-0 small">{formatCnpjExibicao(data.cnpj_tomador)}</p>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="card">
                <div className="card-body row g-3">
                  <div className="col-sm-4">
                    <div className="small text-muted">Emissão</div>
                    <div>{formatDataIso(data.data_emissao)}</div>
                  </div>
                  <div className="col-sm-4">
                    <div className="small text-muted">Valor total</div>
                    <div className="fw-semibold">{formatMoedaBrl(data.valor_total)}</div>
                  </div>
                  <div className="col-sm-4">
                    <div className="small text-muted">Código de verificação</div>
                    <div className="font-monospace small">{data.codigo_verificacao || '—'}</div>
                  </div>
                  <div className="col-12">
                    <div className="small text-muted">Descrição do serviço</div>
                    <div>{data.descricao_servico || '—'}</div>
                  </div>
                  <div className="col-sm-4">
                    <div className="small text-muted">Objetivo da entrada</div>
                    <div>{labelObjetivoEntrada(data.objetivo_entrada)}</div>
                  </div>
                  <div className="col-sm-4">
                    <div className="small text-muted">Registada em</div>
                    <div>{formatDataIso(data.criada_em)}</div>
                  </div>
                  <div className="col-sm-4">
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
                        <th scope="col">Descrição</th>
                        <th scope="col" className="text-end">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.itens.map((item) => (
                        <tr key={item.id}>
                          <td>{item.numero_item}</td>
                          <td className="text-break">{item.descricao || '—'}</td>
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
                <pre className="mb-0 p-3 small bg-light overflow-auto" style={{ maxHeight: '24rem' }}>
                  {data.xml_original}
                </pre>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
