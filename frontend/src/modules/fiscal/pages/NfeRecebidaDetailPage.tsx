import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { catalogoPaths } from '@/modules/catalogo/catalogoPaths'

import NfeManifestacaoDestinatarioPanel from '../components/NfeManifestacaoDestinatarioPanel'
import { fiscalPaths } from '../fiscalPaths'
import { useNfeRecebidaDetailQuery } from '../hooks/useNfeRecebidaDetailQuery'
import {
  formatChaveAcesso,
  formatCnpjExibicao,
  formatDataIso,
  formatMoedaBrl,
  labelOrigemImportacao,
  labelStatusImportacao,
} from '../utils/fiscalDisplay'

/** Detalhe de NF-e recebida: cabeçalho, itens e XML armazenado. */
export default function NfeRecebidaDetailPage() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data, isPending, isError, error } = useNfeRecebidaDetailQuery(id, validId)
  const [xmlAberto, setXmlAberto] = useState(false)

  const downloadNome = useMemo(() => {
    if (!data) return 'nfe.xml'
    return `nfe-${data.numero || data.id}.xml`
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
        <div className="alert alert-warning">Identificador da NF-e inválido.</div>
        <Link to={fiscalPaths.nfes}>Voltar à lista</Link>
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
            <Link to={fiscalPaths.nfes}>NF-es recebidas</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Detalhe
          </li>
        </ol>
      </nav>

      {isPending && <p className="text-muted">Carregando…</p>}
      {isError && (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Não foi possível carregar a NF-e.'}
        </div>
      )}

      {data && (
        <>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <div>
              <h1 className="h3 mb-2">
                NF-e {data.numero || '—'}
                {data.serie ? ` · série ${data.serie}` : ''}
              </h1>
              <p className="text-muted font-monospace small mb-2">{formatChaveAcesso(data.chave_acesso)}</p>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-secondary">{labelStatusImportacao(data.status_importacao)}</span>
                <span className="badge bg-light text-dark border">
                  {labelOrigemImportacao(data.origem_importacao)}
                </span>
                {data.nsu ? (
                  <span className="badge bg-light text-dark border">NSU {data.nsu}</span>
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
                  <h2 className="h6 text-muted text-uppercase">Emitente</h2>
                  <p className="mb-1 fw-semibold">{data.nome_emitente || '—'}</p>
                  <p className="mb-0 small">{formatCnpjExibicao(data.cnpj_emitente)}</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <h2 className="h6 text-muted text-uppercase">Destinatário</h2>
                  <p className="mb-1 fw-semibold">{data.nome_destinatario || '—'}</p>
                  <p className="mb-0 small">{formatCnpjExibicao(data.cnpj_destinatario)}</p>
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
                    <div className="small text-muted">Natureza da operação</div>
                    <div>{data.natureza_operacao || '—'}</div>
                  </div>
                  <div className="col-sm-6">
                    <div className="small text-muted">Registada em</div>
                    <div>{formatDataIso(data.criada_em)}</div>
                  </div>
                  <div className="col-sm-6">
                    <div className="small text-muted">Atualizada em</div>
                    <div>{formatDataIso(data.atualizada_em)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <NfeManifestacaoDestinatarioPanel documento={data} />

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
                        <th scope="col" className="text-end">
                          Qtd
                        </th>
                        <th scope="col" className="text-end">
                          Total
                        </th>
                        <th scope="col">Catálogo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.itens.map((item) => (
                        <tr key={item.id}>
                          <td>{item.numero_item}</td>
                          <td className="text-break">{item.codigo_fornecedor || '—'}</td>
                          <td className="text-break">{item.descricao || '—'}</td>
                          <td>{item.ncm || '—'}</td>
                          <td>{item.cfop || '—'}</td>
                          <td>{item.unidade || '—'}</td>
                          <td className="text-end">{item.quantidade}</td>
                          <td className="text-end">{formatMoedaBrl(item.valor_total)}</td>
                          <td>
                            {item.importado_para_produto ? (
                              <span className="badge bg-success">Sim</span>
                            ) : (
                              <span className="text-muted small">Não</span>
                            )}
                          </td>
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

          <p className="small text-muted">
            Para criar ou atualizar produtos a partir desta nota, use a{' '}
            <Link to={catalogoPaths.produtoImportarNfe}>importação NF-e do catálogo</Link> (fluxo com
            pré-visualização e seleção de itens).
          </p>
        </>
      )}
    </div>
  )
}
