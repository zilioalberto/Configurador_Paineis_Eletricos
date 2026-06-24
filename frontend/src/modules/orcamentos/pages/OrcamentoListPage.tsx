import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { CriarPropostaModal } from '../components/CriarPropostaModal'
import { listarOrcamentos } from '../services/orcamentosApi'
import type { OrcamentoDto } from '../types/orcamentos'

function compararTextoPtBr(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
}

/** Listagem de propostas comerciais e criação via modal. */
export default function OrcamentoListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const canCreateOrcamento = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_CRIAR)

  const [lista, setLista] = useState<OrcamentoDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showCriarModal, setShowCriarModal] = useState(false)

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
    recarregar().catch(() => undefined)
  }, [recarregar])

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(lista.map((orc) => orc.status).filter(Boolean))).sort(compararTextoPtBr),
    [lista]
  )

  const listaFiltrada = useMemo(() => {
    const busca = filtroBusca.trim().toLowerCase()
    return lista.filter((orc) => {
      const cliente = orc.cliente_nome || orc.cliente_referencia || ''
      const texto = `${orc.codigo_base || orc.codigo} ${orc.titulo} ${cliente}`.toLowerCase()
      const matchBusca = !busca || texto.includes(busca)
      const matchCliente = !filtroCliente || cliente === filtroCliente
      const matchStatus = !filtroStatus || orc.status === filtroStatus
      return matchBusca && matchCliente && matchStatus
    })
  }, [filtroBusca, filtroCliente, filtroStatus, lista])

  const clientesNaLista = useMemo(
    () =>
      Array.from(
        new Set(lista.map((orc) => orc.cliente_nome || orc.cliente_referencia).filter(Boolean))
      ).sort(compararTextoPtBr),
    [lista]
  )

  const abrirCriarModal = useCallback(() => {
    setShowCriarModal(true)
  }, [])

  const toolbarConfig = useMemo(
    () => ({
      title: 'Orçamentos',
      subtitle: carregando
        ? 'Carregando propostas'
        : `${listaFiltrada.length} de ${lista.length} proposta(s)`,
      primaryAction: canCreateOrcamento
        ? {
            label: 'Criar proposta',
            onClick: abrirCriarModal,
          }
        : undefined,
    }),
    [abrirCriarModal, canCreateOrcamento, carregando, lista.length, listaFiltrada.length]
  )

  useAppPageToolbar(toolbarConfig)

  const handlePropostaCriada = useCallback(
    (orcamentoId: string) => {
      recarregar().catch(() => undefined)
      navigate(`/orcamentos/${orcamentoId}`)
    },
    [navigate, recarregar]
  )

  return (
    <div className="container-fluid py-3 orcamento-list-page">
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6 col-lg-5">
              <label className="form-label" htmlFor="orc-filtro-busca">
                Buscar
              </label>
              <input
                id="orc-filtro-busca"
                className="form-control"
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                placeholder="Código, cliente ou título"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="orc-filtro-cliente">
                Cliente
              </label>
              <select
                id="orc-filtro-cliente"
                className="form-select"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
              >
                <option value="">Todos</option>
                {clientesNaLista.map((cliente) => (
                  <option key={cliente} value={cliente}>
                    {cliente}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="orc-filtro-status">
                Status
              </label>
              <select
                id="orc-filtro-status"
                className="form-select"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {carregando ? (
            <p className="text-muted mb-0">A carregar…</p>
          ) : null}
          {!carregando && lista.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted mb-3">Nenhum orçamento ainda.</p>
              {canCreateOrcamento ? (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={abrirCriarModal}
                >
                  Criar proposta
                </button>
              ) : null}
            </div>
          ) : null}
          {!carregando && lista.length > 0 && listaFiltrada.length === 0 ? (
            <p className="text-muted mb-0">Nenhum orçamento encontrado com os filtros atuais.</p>
          ) : null}
          {!carregando && lista.length > 0 && listaFiltrada.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Rev.</th>
                    <th>Cliente</th>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Itens</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map((orc) => (
                    <tr key={orc.id}>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link p-0 align-baseline text-start"
                          onClick={() => navigate(`/orcamentos/${orc.id}`)}
                        >
                          <code>{orc.codigo_base || orc.codigo}</code>
                        </button>
                      </td>
                      <td>
                        {orc.revisao?.trim() ? (
                          <span className="badge text-bg-secondary">{orc.revisao}</span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>{orc.cliente_nome || orc.cliente_referencia || '—'}</td>
                      <td>{orc.titulo}</td>
                      <td>{orc.status}</td>
                      <td>{orc.itens?.length ?? 0}</td>
                      <td>
                        <Link
                          className="btn btn-sm btn-outline-primary"
                          to={`/orcamentos/${orc.id}`}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <CriarPropostaModal
        show={showCriarModal}
        onClose={() => setShowCriarModal(false)}
        onCreated={handlePropostaCriada}
      />
    </div>
  )
}
