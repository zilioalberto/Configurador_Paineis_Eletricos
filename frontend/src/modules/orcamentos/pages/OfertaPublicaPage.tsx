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

type DecisaoOferta = 'APROVADO' | 'REJEITADO'

function mensagemErro(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback
}

type DadosResposta = {
  nome: string
  cargo: string
  email: string
  observacao: string
  assinatura: string
  pdfAssinado: File | null
}

async function submeterRespostaOferta(
  token: string,
  decisao: DecisaoOferta,
  dados: DadosResposta
): Promise<void> {
  await responderOfertaPublica(token, {
    decisao,
    nome_responsavel: dados.nome.trim(),
    cargo: dados.cargo.trim(),
    email: dados.email.trim(),
    observacao: dados.observacao.trim(),
    assinatura_data_url: decisao === 'APROVADO' ? dados.assinatura : undefined,
  })
  if (decisao === 'APROVADO' && dados.pdfAssinado) {
    await enviarPdfAssinadoOfertaPublica(token, dados.pdfAssinado)
  }
}

function useOfertaPublicaController(token: string | undefined) {
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
      setErro(mensagemErro(e, 'Não foi possível carregar a proposta.'))
    } finally {
      setCarregando(false)
    }
  }, [token])

  useEffect(() => {
    recarregar().catch(() => undefined)
  }, [recarregar])

  const responder = useCallback(
    async (decisao: DecisaoOferta) => {
      if (!token || !nome.trim()) return
      setProcessando(true)
      try {
        await submeterRespostaOferta(token, decisao, {
          nome,
          cargo,
          email,
          observacao,
          assinatura,
          pdfAssinado,
        })
        await recarregar()
      } catch (e) {
        setErro(mensagemErro(e, 'Não foi possível registrar a resposta.'))
      } finally {
        setProcessando(false)
      }
    },
    [token, nome, cargo, email, observacao, assinatura, pdfAssinado, recarregar]
  )

  return {
    dados,
    erro,
    carregando,
    processando,
    campos: { nome, cargo, email, observacao },
    setNome,
    setCargo,
    setEmail,
    setObservacao,
    setAssinatura,
    setPdfAssinado,
    responder,
  }
}

type RespostaRegistradaProps = Readonly<{
  resposta: OfertaPublicaDto['resposta']
  aprovado: boolean
}>

function RespostaRegistrada({ resposta, aprovado }: RespostaRegistradaProps) {
  if (aprovado) {
    const responsavel = resposta.nome_responsavel || '—'
    const aceiteEm = resposta.aceite_em
      ? new Date(resposta.aceite_em).toLocaleString('pt-BR')
      : '—'
    return <p className="mb-0">{`Aprovada por ${responsavel} em ${aceiteEm}.`}</p>
  }
  const detalhe = resposta.observacao ? `: ${resposta.observacao}` : '.'
  return <p className="mb-0">{`Recusada${detalhe}`}</p>
}

type FormularioRespostaProps = Readonly<{
  erro: string | null
  processando: boolean
  campos: { nome: string; cargo: string; email: string; observacao: string }
  setNome: (v: string) => void
  setCargo: (v: string) => void
  setEmail: (v: string) => void
  setObservacao: (v: string) => void
  setAssinatura: (v: string) => void
  setPdfAssinado: (f: File | null) => void
  onResponder: (decisao: DecisaoOferta) => void
}>

function FormularioResposta({
  erro,
  processando,
  campos,
  setNome,
  setCargo,
  setEmail,
  setObservacao,
  setAssinatura,
  setPdfAssinado,
  onResponder,
}: FormularioRespostaProps) {
  return (
    <>
      <p className="small text-muted">
        Ao confirmar, você declara concordância com os termos desta proposta comercial na versão
        apresentada acima.
      </p>
      {erro ? <p className="text-danger small">{erro}</p> : null}
      <div className="row g-2 mb-2">
        <div className="col-md-6">
          <label className="form-label small" htmlFor="oferta-publica-nome">
            Nome do responsável *
          </label>
          <input
            id="oferta-publica-nome"
            className="form-control form-control-sm"
            value={campos.nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={processando}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small" htmlFor="oferta-publica-cargo">
            Cargo
          </label>
          <input
            id="oferta-publica-cargo"
            className="form-control form-control-sm"
            value={campos.cargo}
            onChange={(e) => setCargo(e.target.value)}
            disabled={processando}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small" htmlFor="oferta-publica-email">
            E-mail
          </label>
          <input
            id="oferta-publica-email"
            type="email"
            className="form-control form-control-sm"
            value={campos.email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={processando}
          />
        </div>
        <div className="col-12">
          <label className="form-label small" htmlFor="oferta-publica-observacao">
            Observações (recusa ou comentários)
          </label>
          <textarea
            id="oferta-publica-observacao"
            className="form-control form-control-sm"
            rows={2}
            value={campos.observacao}
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
          disabled={processando || !campos.nome.trim()}
          onClick={() => onResponder('APROVADO')}
        >
          {processando ? 'Registrando...' : 'Aprovar proposta'}
        </button>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          disabled={processando || !campos.nome.trim()}
          onClick={() => onResponder('REJEITADO')}
        >
          Recusar
        </button>
      </div>
    </>
  )
}

type OfertaPublicaAceiteProps = Readonly<{
  dados: OfertaPublicaDto
  controller: ReturnType<typeof useOfertaPublicaController>
}>

function OfertaPublicaAceite({ dados, controller }: OfertaPublicaAceiteProps) {
  const respondido = dados.resposta.decisao !== 'PENDENTE'
  const aprovado = dados.resposta.decisao === 'APROVADO'
  const recusado = dados.resposta.decisao === 'REJEITADO'

  const classeEstado = [
    'oferta-publica-resposta',
    aprovado ? 'oferta-publica-resposta--ok' : '',
    recusado ? 'oferta-publica-resposta--recusada' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={respondido ? classeEstado : 'oferta-publica-resposta'}>
      <h2 className="h6 mb-2">Aceite da proposta</h2>
      {respondido ? (
        <RespostaRegistrada resposta={dados.resposta} aprovado={aprovado} />
      ) : (
        <FormularioResposta
          erro={controller.erro}
          processando={controller.processando}
          campos={controller.campos}
          setNome={controller.setNome}
          setCargo={controller.setCargo}
          setEmail={controller.setEmail}
          setObservacao={controller.setObservacao}
          setAssinatura={controller.setAssinatura}
          setPdfAssinado={controller.setPdfAssinado}
          onResponder={(decisao) => controller.responder(decisao).catch(() => undefined)}
        />
      )}
    </section>
  )
}

export default function OfertaPublicaPage() {
  const { token } = useParams<{ token: string }>()
  const controller = useOfertaPublicaController(token)
  const { dados, erro, carregando } = controller

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
        <OfertaPublicaAceite dados={dados} controller={controller} />
      </div>
    </div>
  )
}
