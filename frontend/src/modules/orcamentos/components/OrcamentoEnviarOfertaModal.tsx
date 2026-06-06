import { useMemo, useState } from 'react'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { enviarOfertaClienteOrcamento } from '../services/orcamentosApi'
import type { OrcamentoDto } from '../types/orcamentos'

function montarAssuntoPadrao(orcamento: OrcamentoDto) {
  return `Proposta comercial ZFW ${orcamento.codigo}`
}

function montarMensagemPadrao(nomeContato: string) {
  const saudacao = nomeContato.trim() ? `Prezado ${nomeContato.trim()}` : 'Prezado cliente'
  return `${saudacao}

Agradecemos pela oportunidade de apresentar nossa proposta técnico-comercial e pela confiança em considerar a ZFW Engenharia para contribuir com este fornecimento.

Encaminhamos em anexo a oferta elaborada com base nas informações recebidas e nas condições técnicas avaliadas até o momento. Buscamos estruturar uma solução alinhada às necessidades do projeto, mantendo a proposta dentro de uma condição técnica e comercial viável para ambas as partes.

Permanecemos à disposição para esclarecer eventuais dúvidas, realizar ajustes que se façam necessários ou complementar qualquer informação referente ao escopo apresentado.

Será um prazer contribuir com este projeto.

Atenciosamente,
ZFW Engenharia`
}

function separarEmails(valor: string) {
  return valor
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean)
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type Props = Readonly<{
  orcamento: OrcamentoDto
  onClose: () => void
  onEnviado: (orcamento: OrcamentoDto, linkPublico: string) => void
  onSolicitarFinalizar?: () => void
  finalizando?: boolean
}>

export default function OrcamentoEnviarOfertaModal({
  orcamento,
  onClose,
  onEnviado,
  onSolicitarFinalizar,
  finalizando = false,
}: Props) {
  const { showToast } = useToast()
  const [processando, setProcessando] = useState(false)
  const [destinatarioNome, setDestinatarioNome] = useState(orcamento.contato_cliente_nome || '')
  const [destinatarioEmails, setDestinatarioEmails] = useState(orcamento.contato_cliente_email || '')
  const [assunto, setAssunto] = useState(() => montarAssuntoPadrao(orcamento))
  const [mensagem, setMensagem] = useState(() => montarMensagemPadrao(orcamento.contato_cliente_nome))
  const [enviarEmail, setEnviarEmail] = useState(Boolean(orcamento.contato_cliente_email?.trim()))

  const prontoParaEnviar = useMemo(
    () => orcamento.status === 'FINALIZADO' || orcamento.status === 'ENVIADO',
    [orcamento.status]
  )

  async function confirmarEnvio() {
    if (!prontoParaEnviar) return
    const emails = separarEmails(destinatarioEmails)
    if (enviarEmail) {
      if (emails.length === 0) {
        showToast({ variant: 'warning', message: 'Informe ao menos um e-mail do destinatário.' })
        return
      }
      const emailInvalido = emails.find((email) => !emailValido(email))
      if (emailInvalido) {
        showToast({ variant: 'warning', message: `Revise o e-mail informado: ${emailInvalido}.` })
        return
      }
    }
    setProcessando(true)
    try {
      const atualizado = await enviarOfertaClienteOrcamento(orcamento.id, {
        destinatario_nome: destinatarioNome.trim(),
        destinatario_email: emails[0] ?? '',
        destinatario_emails: emails,
        assunto: assunto.trim(),
        mensagem: mensagem.trim(),
        enviar_email: enviarEmail,
      })
      const link = atualizado.link_publico || ''
      const emailFalhou = enviarEmail && atualizado.email_erro?.trim()
      showToast({
        variant: emailFalhou ? 'warning' : 'success',
        title: emailFalhou ? 'E-mail não enviado' : undefined,
        message: emailFalhou
          ? `A oferta foi gerada e o link está disponível, mas o e-mail não pôde ser enviado: ${atualizado.email_erro}`
          : enviarEmail
            ? 'Oferta enviada. Verifique se o e-mail foi entregue.'
            : 'Oferta registrada. Copie o link público para o cliente.',
      })
      onEnviado(atualizado, link)
      onClose()
    } catch (err) {
      showToast({
        variant: 'danger',
        message: extrairMensagemErroApi(err) || 'Não foi possível enviar a oferta.',
      })
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ background: 'rgba(0,0,0,.45)' }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">Enviar oferta ao cliente</h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              disabled={processando}
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            {!prontoParaEnviar ? (
              <div className="alert alert-warning">
                <p className="mb-2">
                  A oferta precisa estar <strong>finalizada</strong> antes do envio (congela a
                  versão enviada ao cliente).
                </p>
                {onSolicitarFinalizar ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    onClick={onSolicitarFinalizar}
                    disabled={finalizando}
                  >
                    {finalizando ? 'Finalizando...' : 'Finalizar oferta agora'}
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <p className="text-muted small">
                  O sistema gera o PDF, cria um link público para o cliente visualizar, aprovar ou
                  recusar, e registra o envio na proposta <strong>{orcamento.codigo}</strong>.
                </p>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small">Destinatário</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={destinatarioNome}
                      onChange={(e) => setDestinatarioNome(e.target.value)}
                      disabled={processando}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">E-mails</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={destinatarioEmails}
                      onChange={(e) => setDestinatarioEmails(e.target.value)}
                      disabled={processando}
                    />
                    <p className="form-text mb-0">Separe múltiplos e-mails por vírgula, ponto e vírgula ou linha.</p>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Assunto do e-mail</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={assunto}
                      onChange={(e) => setAssunto(e.target.value)}
                      disabled={processando}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Mensagem</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={10}
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      disabled={processando}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-check-label">
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={enviarEmail}
                        onChange={(e) => setEnviarEmail(e.target.checked)}
                        disabled={processando}
                      />
                      Enviar e-mail com PDF anexo e link da proposta
                    </label>
                    <p className="form-text mb-0">
                      Se o servidor de e-mail não estiver configurado, use apenas o link copiado
                      após o envio.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={processando}
            >
              Cancelar
            </button>
            {prontoParaEnviar ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void confirmarEnvio()}
                disabled={processando}
              >
                {processando ? 'Enviando...' : 'Confirmar envio'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
