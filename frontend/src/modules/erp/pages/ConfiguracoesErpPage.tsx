import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import { atualizarParametroConfiguracao, listarParametrosConfiguracao } from '../services/erpApi'
import type { ParametroConfiguracaoDto } from '../types/erp'

export default function ConfiguracoesErpPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const podeGerenciar = hasPermission(user, PERMISSION_KEYS.CONFIGURACAO_ERP_GERENCIAR)

  const [lista, setLista] = useState<ParametroConfiguracaoDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editandoChave, setEditandoChave] = useState<string | null>(null)
  const [valorRascunho, setValorRascunho] = useState('')
  const [descricaoRascunho, setDescricaoRascunho] = useState('')
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await listarParametrosConfiguracao()
      setLista(dados)
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível carregar os parâmetros.',
      })
    } finally {
      setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  function iniciarEdicao(p: ParametroConfiguracaoDto) {
    setEditandoChave(p.chave)
    setValorRascunho(p.valor ?? '')
    setDescricaoRascunho(p.descricao ?? '')
  }

  function cancelarEdicao() {
    setEditandoChave(null)
    setValorRascunho('')
    setDescricaoRascunho('')
  }

  async function guardarParametro(chave: string) {
    setSalvandoChave(chave)
    try {
      const atualizado = await atualizarParametroConfiguracao(chave, {
        valor: valorRascunho,
        descricao: descricaoRascunho.trim(),
      })
      setLista((rows) => rows.map((r) => (r.chave === chave ? atualizado : r)))
      cancelarEdicao()
      showToast({ variant: 'success', message: 'Parâmetro atualizado.' })
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível guardar o parâmetro.',
      })
    } finally {
      setSalvandoChave(null)
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
            Configurações do ERP
          </li>
        </ol>
      </nav>

      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="h4">Parâmetros</h1>
          <p className="text-muted">
            Chave/valor genéricos para numeração, flags e regras.
            {podeGerenciar ? ' Pode editar valor e descrição.' : ' Só visualização.'}
          </p>
          {carregando ? (
            <p className="text-muted mb-0">A carregar…</p>
          ) : lista.length === 0 ? (
            <p className="text-muted mb-0">Nenhum parâmetro registado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Chave</th>
                    <th>Valor</th>
                    <th>Descrição</th>
                    {podeGerenciar ? <th aria-label="Ações" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <code>{p.chave}</code>
                      </td>
                      <td>
                        {editandoChave === p.chave && podeGerenciar ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={valorRascunho}
                            onChange={(e) => setValorRascunho(e.target.value)}
                            disabled={salvandoChave === p.chave}
                            aria-label={`Valor de ${p.chave}`}
                          />
                        ) : (
                          p.valor || '—'
                        )}
                      </td>
                      <td>
                        {editandoChave === p.chave && podeGerenciar ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={descricaoRascunho}
                            onChange={(e) => setDescricaoRascunho(e.target.value)}
                            disabled={salvandoChave === p.chave}
                            aria-label={`Descrição de ${p.chave}`}
                          />
                        ) : (
                          p.descricao || '—'
                        )}
                      </td>
                      {podeGerenciar ? (
                        <td>
                          {editandoChave === p.chave ? (
                            <div className="d-flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={salvandoChave === p.chave}
                                onClick={() => void guardarParametro(p.chave)}
                              >
                                {salvandoChave === p.chave ? '…' : 'Guardar'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={salvandoChave === p.chave}
                                onClick={cancelarEdicao}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => iniciarEdicao(p)}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      ) : null}
                    </tr>
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
