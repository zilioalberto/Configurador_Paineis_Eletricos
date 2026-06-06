import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import PropostaClienteDocument from '../components/PropostaClienteDocument'
import AssinaturaCanvas from '../components/AssinaturaCanvas'
import {
  enviarPdfAssinadoOfertaPublica,
  obterOfertaPublica,
  responderOfertaPublica,
  type OfertaPublicaDto,
} from '../services/ofertaPublicaApi'

import './OfertaPublicaPage.css'

export default function OfertaPublicaPage() {
  const { token } = useParams<{ token: string }>()
  const [dados, setDados] = useState<OfertaPublicaDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [email, setEmail] = useState('')
  const [observacao, setObservacao] = useState('')
  const [assinatura, setAssinatura] = useState('')
  const [pdfAssinado, setPdfAssinado] = useState<File | null>(null)

  const recarregar = useCallback(async () => {
    if (!token) return
    setCarregando(true)
    setErro(null)
    try {
      const resp = await obterOfertaPublica(token)
      setDados(resp)
      if (resp.resposta.nome_responsavel) setNome(resp.resposta.nome_responsavel)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a proposta.')
    } finally {
      setCarregando(false)
    }
  }, [token])

  useEffect(() => {
    recarregar().catch(() => undefined)
  }, [recarregar])

  async function responder(decisao: 'APROVADO' | 'REJEITADO') {
    if (!token || !nome.trim()) return
    setProcessando(true)
    try {
      await responderOfertaPublica(token, {
        decisao,
        nome_responsavel: nome.trim(),
        cargo: cargo.trim(),
        email: email.trim(),
        observacao: observacao.trim(),
        assinatura_data_url: decisao === 'APROVADO' ? assinatura : undefined,
      })
      if (decisao === 'APROVADO' && pdfAssinado) {
        await enviarPdfAssinadoOfertaPublica(token, pdfAssinado)
      }
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar a resposta.')
    } finally {
      setProcessando(false)
    }
  }

  if (!token) {
    return (
      <div className="oferta-publica-page p-4">
        <p className="text-danger">Link inválido.</p>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="oferta-publica-page p-4 text-center">
        <output className="spinner-border text-primary" aria-live="polite" />
      </div>
    )
  }

  if (erro && !dados) {
    return (
      <div className="oferta-publica-page p-4">
        <p className="text-danger">{erro}</p>
      </div>
    )
  }

  if (!dados) return null

  const respondido = dados.resposta.decisao !== 'PENDENTE'
  const aprovado = dados.resposta.decisao === 'APROVADO'
  const recusado = dados.resposta.decisao === 'REJEITADO'

  return (
    <div className="oferta-publica-page">
      <header className="oferta-publica-page__topbar">
        <strong>ZFW Engenharia</strong>
        <span className="text-muted ms-2">Proposta {dados.codigo}</span>
        {dados.valido_ate ? (
          <span className="text-muted small ms-2">· válida até {dados.valido_ate}</span>
        ) : null}
      </header>

      <div className="oferta-publica-page__conteudo">
        <PropostaClienteDocument preview={dados.preview} paginaImpressao />

        <section
          className={
            respondido
              ? `oferta-publica-resposta ${aprovado ? 'oferta-publica-resposta--ok' : ''} ${recusado ? 'oferta-publica-resposta--recusada' : ''}`
              : 'oferta-publica-resposta'
          }
        >
          <h2 className="h6 mb-2">Aceite da proposta</h2>

          {respondido ? (
            <p className="mb-0">
              {aprovado
                ? `Aprovada por ${dados.resposta.nome_responsavel || '—'} em ${dados.resposta.aceite_em ? new Date(dados.resposta.aceite_em).toLocaleString('pt-BR') : '—'}.`
                : `Recusada${dados.resposta.observacao ? `: ${dados.resposta.observacao}` : '.'}`}
            </p>
          ) : (
            <>
              <p className="small text-muted">
                Ao confirmar, você declara concordância com os termos desta proposta comercial na
                versão apresentada acima.
              </p>
              {erro ? <p className="text-danger small">{erro}</p> : null}
              <div className="row g-2 mb-2">
                <div className="col-md-6">
                  <label className="form-label small">Nome do responsável *</label>
                  <input
                    className="form-control form-control-sm"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    disabled={processando}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Cargo</label>
                  <input
                    className="form-control form-control-sm"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    disabled={processando}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">E-mail</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={processando}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small">Observações (recusa ou comentários)</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    disabled={processando}
                  />
                </div>
              </div>
              <p className="small fw-semibold mb-1">Assinatura (opcional, ao aprovar)</p>
              <AssinaturaCanvas onChange={setAssinatura} disabled={processando} />
              <div className="mt-2">
                <label className="form-label small" htmlFor="oferta-publica-pdf-assinado">
                  Ou anexe PDF já assinado (após aprovar)
                </label>
                <input
                  id="oferta-publica-pdf-assinado"
                  type="file"
                  accept="application/pdf"
                  className="form-control form-control-sm"
                  onChange={(e) => setPdfAssinado(e.target.files?.[0] ?? null)}
                  disabled={processando}
                />
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  disabled={processando || !nome.trim()}
                  onClick={() => responder('APROVADO').catch(() => undefined)}
                >
                  {processando ? 'Registrando...' : 'Aprovar proposta'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  disabled={processando || !nome.trim()}
                  onClick={() => responder('REJEITADO').catch(() => undefined)}
                >
                  Recusar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
