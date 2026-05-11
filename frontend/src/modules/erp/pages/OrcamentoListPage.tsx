import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import {
  criarOrcamento,
  listarClientesOrcamento,
  listarContatosCliente,
  listarOrcamentos,
} from '../services/erpApi'
import type { ContatoClienteDto, OrcamentoDto, ParceiroClienteDto } from '../types/erp'

export default function OrcamentoListPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [lista, setLista] = useState<OrcamentoDto[]>([])
  const [clientes, setClientes] = useState<ParceiroClienteDto[]>([])
  const [contatos, setContatos] = useState<ContatoClienteDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoClientes, setCarregandoClientes] = useState(true)
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [contatoId, setContatoId] = useState('')
  const [enviando, setEnviando] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await listarOrcamentos()
      setLista(dados)
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível carregar os orçamentos.',
      })
    } finally {
      setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  useEffect(() => {
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
  }, [showToast])

  useEffect(() => {
    let ativo = true
    setContatoId('')
    setContatos([])
    if (!clienteId) return () => {
      ativo = false
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
  }, [clienteId, showToast])

  async function handleCriar(event: React.FormEvent) {
    event.preventDefault()
    if (!clienteId || !titulo.trim()) return
    setEnviando(true)
    try {
      const criado = await criarOrcamento({
        titulo: titulo.trim(),
        cliente: clienteId,
        contato_cliente: contatoId || null,
      })
      setTitulo('')
      setClienteId('')
      setContatoId('')
      showToast({ variant: 'success', message: 'Orçamento criado.' })
      await recarregar()
      navigate(`/erp/orcamentos/${criado.id}`)
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

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Módulos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Orçamentos
          </li>
        </ol>
      </nav>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5">Novo orçamento</h2>
              <form onSubmit={(e) => void handleCriar(e)} className="vstack gap-2">
                <div>
                  <label className="form-label" htmlFor="orc-cliente">
                    Cliente
                  </label>
                  <select
                    id="orc-cliente"
                    className="form-select"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    disabled={carregandoClientes}
                    required
                  >
                    <option value="">Selecione...</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.razao_social} ({cliente.documento})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="orc-contato">
                    Contato do cliente
                  </label>
                  <select
                    id="orc-contato"
                    className="form-select"
                    value={contatoId}
                    onChange={(e) => setContatoId(e.target.value)}
                    disabled={!clienteId || contatos.length === 0}
                  >
                    <option value="">Sem contato selecionado</option>
                    {contatos.map((contato) => (
                      <option key={contato.id} value={contato.id}>
                        {contato.nome}
                        {contato.email ? ` (${contato.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="orc-titulo">
                    Título
                  </label>
                  <input
                    id="orc-titulo"
                    className="form-control"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={enviando || !clienteId || !titulo.trim()}
                >
                  {enviando ? 'A guardar…' : 'Criar rascunho'}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5">Lista</h2>
              {carregando ? (
                <p className="text-muted mb-0">A carregar…</p>
              ) : lista.length === 0 ? (
                <p className="text-muted mb-0">Nenhum orçamento ainda.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Cliente</th>
                        <th>Título</th>
                        <th>Estado</th>
                        <th>Itens</th>
                        <th aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((orc) => (
                        <tr key={orc.id}>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link p-0 align-baseline text-start"
                              onClick={() => navigate(`/erp/orcamentos/${orc.id}`)}
                            >
                              <code>{orc.codigo}</code>
                            </button>
                          </td>
                          <td>{orc.cliente_nome || orc.cliente_referencia || '—'}</td>
                          <td>{orc.titulo}</td>
                          <td>{orc.status}</td>
                          <td>{orc.itens?.length ?? 0}</td>
                          <td>
                            <Link
                              className="btn btn-sm btn-outline-primary"
                              to={`/erp/orcamentos/${orc.id}`}
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
