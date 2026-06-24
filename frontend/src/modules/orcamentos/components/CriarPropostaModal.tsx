/** Modal para cadastrar proposta comercial (cliente, contato e título). */

import {
  type SyntheticEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import {
  criarOrcamento,
  listarClientesOrcamento,
  listarContatosCliente,
} from '../services/orcamentosApi'
import type { ContatoClienteDto, ParceiroClienteDto } from '../types/orcamentos'

export const CRIAR_PROPOSTA_FORM_ID = 'criar-proposta-form'

type Props = Readonly<{
  show: boolean
  onClose: () => void
  onCreated: (orcamentoId: string) => void
}>

export function CriarPropostaModal({ show, onClose, onCreated }: Props) {
  const { showToast } = useToast()
  const [clientes, setClientes] = useState<ParceiroClienteDto[]>([])
  const [contatos, setContatos] = useState<ContatoClienteDto[]>([])
  const [carregandoClientes, setCarregandoClientes] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [contatoId, setContatoId] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!show) return
    setTitulo('')
    setClienteId('')
    setContatoId('')
    setContatos([])
  }, [show])

  useEffect(() => {
    if (!show) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && !enviando) onClose()
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [show, onClose, enviando])

  useEffect(() => {
    if (!show) return
    let ativo = true
    setCarregandoClientes(true)
    listarClientesOrcamento()
      .then((dados) => {
        if (ativo) setClientes(dados)
      })
      .catch(() => {
        if (ativo) {
          showToast({
            variant: 'danger',
            title: 'Clientes',
            message: 'Não foi possível carregar os clientes cadastrados.',
          })
        }
      })
      .finally(() => {
        if (ativo) setCarregandoClientes(false)
      })
    return () => {
      ativo = false
    }
  }, [show, showToast])

  useEffect(() => {
    if (!show) return
    let ativo = true
    setContatoId('')
    setContatos([])
    if (!clienteId) {
      return () => {
        ativo = false
      }
    }
    listarContatosCliente(clienteId)
      .then((dados) => {
        if (ativo) {
          setContatos(dados)
          const principal = dados.find((contato) => contato.principal) ?? dados[0]
          setContatoId(principal?.id ?? '')
        }
      })
      .catch(() => {
        if (ativo) {
          showToast({
            variant: 'warning',
            title: 'Contatos',
            message: 'Não foi possível carregar os contatos do cliente.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [clienteId, show, showToast])

  const handleFormKeyDown = useCallback((e: ReactKeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return
    if (e.target instanceof HTMLTextAreaElement) return
    e.preventDefault()
  }, [])

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clienteId || !titulo.trim()) return
    setEnviando(true)
    try {
      const criado = await criarOrcamento({
        titulo: titulo.trim(),
        cliente: clienteId,
        contato_cliente: contatoId || null,
      })
      showToast({ variant: 'success', message: 'Orçamento criado.' })
      onCreated(criado.id)
      onClose()
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível criar o orçamento.',
      })
    } finally {
      setEnviando(false)
    }
  }

  if (!show) return null

  const podeSalvar = Boolean(clienteId && titulo.trim())

  return (
    <div className="nova-carga-drawer" role="presentation">
      <button
        type="button"
        className="nova-carga-drawer__backdrop"
        aria-label="Fechar"
        disabled={enviando}
        onClick={onClose}
      />
      <aside
        className="nova-carga-drawer__panel nova-carga-drawer__panel--static"
        role="dialog"
        aria-modal="true"
        aria-labelledby="criar-proposta-title"
        style={{ width: 'min(96vw, 36rem)' }}
      >
        <header className="nova-carga-drawer__header">
          <div className="min-w-0 flex-grow-1">
            <h2 id="criar-proposta-title" className="h5 mb-0">
              Nova proposta
            </h2>
            <p className="small text-muted mb-0">Informe cliente, contato e título da proposta.</p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <button
              type="submit"
              form={CRIAR_PROPOSTA_FORM_ID}
              className="btn btn-success btn-sm"
              disabled={enviando || !podeSalvar}
            >
              {enviando ? 'Criando…' : 'Criar proposta'}
            </button>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={enviando}
              aria-label="Fechar"
            />
          </div>
        </header>

        <div className="nova-carga-drawer__body">
          {carregandoClientes ? <p className="text-muted small mb-3">Carregando clientes…</p> : null}

          {!carregandoClientes && clientes.length === 0 ? (
            <div className="alert alert-warning py-2 small mb-3" role="alert">
              Não há clientes cadastrados. Cadastre um parceiro do tipo cliente em Cadastros antes de
              criar a proposta.
            </div>
          ) : null}

          <form
            id={CRIAR_PROPOSTA_FORM_ID}
            className="row g-3"
            onSubmit={(e) => void handleSubmit(e)}
            onKeyDown={handleFormKeyDown}
          >
            <div className="col-12">
              <label className="form-label" htmlFor="criar-proposta-cliente">
                Cliente
              </label>
              <select
                id="criar-proposta-cliente"
                className="form-select"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={carregandoClientes || clientes.length === 0}
                required
              >
                <option value="">Selecione…</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razao_social} ({cliente.documento})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="criar-proposta-contato">
                Contato
              </label>
              <select
                id="criar-proposta-contato"
                className="form-select"
                value={contatoId}
                onChange={(e) => setContatoId(e.target.value)}
                disabled={!clienteId || contatos.length === 0}
              >
                <option value="">Sem contato</option>
                {contatos.map((contato) => (
                  <option key={contato.id} value={contato.id}>
                    {contato.nome}
                    {contato.email ? ` (${contato.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="criar-proposta-titulo">
                Título
              </label>
              <input
                id="criar-proposta-titulo"
                className="form-control"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={200}
                placeholder="Ex.: Painel CCM — obra XYZ"
                required
              />
            </div>
          </form>

          <div className="mt-3 pt-2 border-top">
            <Link className="small text-muted" to="/orcamentos/margens-clientes" onClick={onClose}>
              Configurar margens por cliente
            </Link>
          </div>
        </div>
      </aside>
    </div>
  )
}
