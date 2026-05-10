import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { criarOrcamento, listarOrcamentos } from '../services/erpApi'
import type { OrcamentoDto } from '../types/erp'

export default function OrcamentoListPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [lista, setLista] = useState<OrcamentoDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [titulo, setTitulo] = useState('')
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

  async function handleCriar(event: React.FormEvent) {
    event.preventDefault()
    if (!codigo.trim() || !titulo.trim()) return
    setEnviando(true)
    try {
      await criarOrcamento({
        codigo: codigo.trim(),
        titulo: titulo.trim(),
        itens: [
          {
            descricao: 'Item inicial (edite depois)',
            quantidade: 1,
            preco_unitario: 0,
            ordem: 0,
          },
        ],
      })
      setCodigo('')
      setTitulo('')
      showToast({ variant: 'success', message: 'Orçamento criado.' })
      await recarregar()
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
                  <label className="form-label" htmlFor="orc-codigo">
                    Código
                  </label>
                  <input
                    id="orc-codigo"
                    className="form-control"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    maxLength={32}
                    required
                  />
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
                <button type="submit" className="btn btn-primary" disabled={enviando}>
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
