import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import {
  atualizarMargemCliente,
  criarMargemCliente,
  listarClientesOrcamento,
  listarMargensClientes,
} from '../services/orcamentosApi'
import type { ConfiguracaoMargemClienteDto, ParceiroClienteDto } from '../types/orcamentos'

export default function MargensClientesPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const clienteParam = searchParams.get('cliente') ?? ''
  const podeEditar = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_EDITAR)

  const [margens, setMargens] = useState<ConfiguracaoMargemClienteDto[]>([])
  const [clientes, setClientes] = useState<ParceiroClienteDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [novoClienteId, setNovoClienteId] = useState('')
  const [novoMargemProd, setNovoMargemProd] = useState('0')
  const [novoMargemServ, setNovoMargemServ] = useState('0')

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [listaMargens, listaClientes] = await Promise.all([
        listarMargensClientes(),
        listarClientesOrcamento(),
      ])
      setMargens(listaMargens)
      setClientes(listaClientes)
    } catch {
      showToast({
        variant: 'danger',
        message: 'Não foi possível carregar margens ou clientes.',
      })
    } finally {
      setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const margemClienteSelecionado = useMemo(
    () => margens.find((m) => m.cliente === clienteParam),
    [clienteParam, margens]
  )

  const clientesSemMargem = useMemo(() => {
    const comMargem = new Set(margens.map((m) => m.cliente))
    return clientes.filter((c) => !comMargem.has(c.id))
  }, [clientes, margens])

  useEffect(() => {
    if (!clienteParam) return
    setNovoClienteId(margemClienteSelecionado ? '' : clienteParam)
  }, [clienteParam, margemClienteSelecionado])

  async function guardarMargem(m: ConfiguracaoMargemClienteDto, prod: string, serv: string) {
    setSalvandoId(m.id)
    try {
      const atualizado = await atualizarMargemCliente(m.id, {
        margem_produtos_percentual: prod.trim() || '0',
        margem_servicos_percentual: serv.trim() || '0',
      })
      setMargens((rows) => rows.map((r) => (r.id === m.id ? atualizado : r)))
      showToast({ variant: 'success', message: 'Margens atualizadas.' })
    } catch {
      showToast({ variant: 'danger', message: 'Não foi possível guardar as margens.' })
    } finally {
      setSalvandoId(null)
    }
  }

  async function criarMargem() {
    if (!novoClienteId) {
      showToast({ variant: 'warning', message: 'Selecione o cliente.' })
      return
    }
    setSalvandoId('novo')
    try {
      const criado = await criarMargemCliente({
        cliente: novoClienteId,
        margem_produtos_percentual: novoMargemProd.trim() || '0',
        margem_servicos_percentual: novoMargemServ.trim() || '0',
      })
      setMargens((rows) => [...rows, criado].sort((a, b) =>
        a.cliente_nome.localeCompare(b.cliente_nome)
      ))
      setNovoClienteId('')
      setNovoMargemProd('0')
      setNovoMargemServ('0')
      showToast({ variant: 'success', message: 'Margens do cliente criadas.' })
    } catch {
      showToast({
        variant: 'danger',
        message: 'Não foi possível criar (cliente já pode ter margem definida).',
      })
    } finally {
      setSalvandoId(null)
    }
  }

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/orcamentos">Orçamentos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Margens por cliente
          </li>
        </ol>
      </nav>

      <h1 className="h4 mb-2">Margens padrão por cliente</h1>
      <p className="text-muted small mb-4">
        Aplicadas automaticamente ao criar novas propostas para o cliente. Não alteram propostas já
        existentes.
      </p>

      {margemClienteSelecionado ? (
        <div className="alert alert-light border py-2 small" role="status">
          Cliente selecionado: <strong>{margemClienteSelecionado.cliente_nome}</strong>
        </div>
      ) : null}

      {podeEditar ? (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6">Nova configuração</h2>
            <div className="row g-2 align-items-end">
              <div className="col-md-5">
                <label className="form-label small" htmlFor="margem-novo-cliente">
                  Cliente
                </label>
                <select
                  id="margem-novo-cliente"
                  className="form-select form-select-sm"
                  value={novoClienteId}
                  onChange={(e) => setNovoClienteId(e.target.value)}
                  disabled={salvandoId !== null}
                >
                  <option value="">Selecione…</option>
                  {clientesSemMargem.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razao_social}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small" htmlFor="margem-novo-prod">
                  Prod. %
                </label>
                <input
                  id="margem-novo-prod"
                  className="form-control form-control-sm"
                  value={novoMargemProd}
                  onChange={(e) => setNovoMargemProd(e.target.value)}
                  disabled={salvandoId !== null}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small" htmlFor="margem-novo-serv">
                  Serv. %
                </label>
                <input
                  id="margem-novo-serv"
                  className="form-control form-control-sm"
                  value={novoMargemServ}
                  onChange={(e) => setNovoMargemServ(e.target.value)}
                  disabled={salvandoId !== null}
                />
              </div>
              <div className="col-md-3">
                <button
                  type="button"
                  className="btn btn-sm btn-primary w-100"
                  disabled={salvandoId !== null || !novoClienteId}
                  onClick={() => void criarMargem()}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card shadow-sm">
        <div className="card-body">
          {carregando ? (
            <p className="text-muted mb-0">A carregar…</p>
          ) : margens.length === 0 ? (
            <p className="text-muted mb-0">Nenhuma margem configurada.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="text-end">Margem produtos %</th>
                    <th className="text-end">Margem serviços %</th>
                    {podeEditar ? <th aria-label="Ações" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {margens.map((m) => (
                    <MargemClienteRow
                      key={m.id}
                      margem={m}
                      selecionada={m.cliente === clienteParam}
                      podeEditar={podeEditar}
                      salvando={salvandoId === m.id}
                      onGuardar={guardarMargem}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MargemClienteRow({
  margem,
  selecionada,
  podeEditar,
  salvando,
  onGuardar,
}: Readonly<{
  margem: ConfiguracaoMargemClienteDto
  selecionada?: boolean
  podeEditar: boolean
  salvando: boolean
  onGuardar: (m: ConfiguracaoMargemClienteDto, prod: string, serv: string) => void
}>) {
  const [prod, setProd] = useState(String(margem.margem_produtos_percentual))
  const [serv, setServ] = useState(String(margem.margem_servicos_percentual))

  useEffect(() => {
    setProd(String(margem.margem_produtos_percentual))
    setServ(String(margem.margem_servicos_percentual))
  }, [margem.margem_produtos_percentual, margem.margem_servicos_percentual])

  return (
    <tr className={selecionada ? 'table-primary' : undefined}>
      <td>{margem.cliente_nome}</td>
      <td className="text-end">
        {podeEditar ? (
          <input
            className="form-control form-control-sm text-end"
            value={prod}
            onChange={(e) => setProd(e.target.value)}
            disabled={salvando}
            aria-label={`Margem produtos ${margem.cliente_nome}`}
          />
        ) : (
          prod
        )}
      </td>
      <td className="text-end">
        {podeEditar ? (
          <input
            className="form-control form-control-sm text-end"
            value={serv}
            onChange={(e) => setServ(e.target.value)}
            disabled={salvando}
            aria-label={`Margem serviços ${margem.cliente_nome}`}
          />
        ) : (
          serv
        )}
      </td>
      {podeEditar ? (
        <td className="text-end">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={salvando}
            onClick={() => onGuardar(margem, prod, serv)}
          >
            {salvando ? '…' : 'Guardar'}
          </button>
        </td>
      ) : null}
    </tr>
  )
}
