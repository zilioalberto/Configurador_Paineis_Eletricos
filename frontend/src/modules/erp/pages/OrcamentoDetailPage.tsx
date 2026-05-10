import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import {
  atualizarOrcamento,
  listarClientesOrcamento,
  listarContatosCliente,
  obterOrcamento,
} from '../services/erpApi'
import type {
  ContatoClienteDto,
  OrcamentoDto,
  OrcamentoItemDto,
  ParceiroClienteDto,
} from '../types/erp'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

type LinhaEditavel = {
  id?: string
  ordem: number
  tipo: 'PRODUTO' | 'SERVICO'
  descricao: string
  quantidade: string
  custo_unitario: string
  margem_percentual: string
  preco_unitario: string
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function itensParaLinhas(itens: OrcamentoItemDto[]): LinhaEditavel[] {
  return [...itens]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item, idx) => ({
      id: item.id,
      ordem: idx,
      tipo: item.tipo ?? 'PRODUTO',
      descricao: item.descricao,
      quantidade: String(item.quantidade),
      custo_unitario: String(item.custo_unitario ?? '0'),
      margem_percentual: String(item.margem_percentual ?? '0'),
      preco_unitario: String(item.preco_unitario),
    }))
}

function parseDecimalPt(valor: string): number {
  const normalizado = valor.trim().replace(/\s/g, '').replace(',', '.')
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : NaN
}

export default function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const { user } = useAuth()
  const podeEditar = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_EDITAR)

  const [orcamento, setOrcamento] = useState<OrcamentoDto | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoItens, setSalvandoItens] = useState(false)
  const [clientes, setClientes] = useState<ParceiroClienteDto[]>([])
  const [contatos, setContatos] = useState<ContatoClienteDto[]>([])

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [contatoId, setContatoId] = useState('')
  const [status, setStatus] = useState('RASCUNHO')
  const [validoAte, setValidoAte] = useState('')
  const [linhasItens, setLinhasItens] = useState<LinhaEditavel[]>([])

  const recarregar = useCallback(async () => {
    if (!id) return
    setCarregando(true)
    try {
      const dados = await obterOrcamento(id)
      setOrcamento(dados)
      setTitulo(dados.titulo)
      setDescricao(dados.descricao ?? '')
      setClienteId(dados.cliente ?? '')
      setContatoId(dados.contato_cliente ?? '')
      setStatus(dados.status)
      setValidoAte(toDateInputValue(dados.valido_ate))
      setLinhasItens(itensParaLinhas(dados.itens ?? []))
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível carregar o orçamento.',
      })
      setOrcamento(null)
    } finally {
      setCarregando(false)
    }
  }, [id, showToast])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  useEffect(() => {
    let ativo = true
    listarClientesOrcamento()
      .then((dados) => {
        if (ativo) setClientes(dados)
      })
      .catch(() => {
        if (ativo) {
          showToast({
            variant: 'warning',
            title: 'Clientes',
            message: 'Não foi possível carregar os clientes cadastrados.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [showToast])

  useEffect(() => {
    let ativo = true
    if (!clienteId) {
      setContatos([])
      setContatoId('')
      return () => {
        ativo = false
      }
    }
    listarContatosCliente(clienteId)
      .then((dados) => {
        if (ativo) {
          setContatos(dados)
          setContatoId((atual) =>
            atual && dados.some((contato) => contato.id === atual) ? atual : ''
          )
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

  const totalOrcamento = useMemo(() => {
    let soma = 0
    for (const linha of linhasItens) {
      const q = parseDecimalPt(linha.quantidade)
      const p = parseDecimalPt(linha.preco_unitario)
      if (!Number.isFinite(q) || !Number.isFinite(p)) continue
      soma += q * p
    }
    return soma
  }, [linhasItens])

  async function handleSalvarCabecalho(event: React.FormEvent) {
    event.preventDefault()
    if (!id || !podeEditar) return
    setSalvando(true)
    try {
      const atualizado = await atualizarOrcamento(id, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        cliente: clienteId || null,
        contato_cliente: contatoId || null,
        status,
        valido_ate: validoAte.trim() ? validoAte.trim() : null,
      })
      setOrcamento(atualizado)
      setLinhasItens(itensParaLinhas(atualizado.itens ?? []))
      showToast({ variant: 'success', message: 'Dados do orçamento guardados.' })
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível guardar as alterações.',
      })
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvarItens() {
    if (!id || !podeEditar) return
    const linhasValidas = linhasItens.filter((l) => l.descricao.trim())
    if (linhasValidas.length !== linhasItens.length) {
      showToast({
        variant: 'warning',
        message: 'Preencha a descrição de todas as linhas ou remova linhas vazias.',
      })
      return
    }
    setSalvandoItens(true)
    try {
      const atualizado = await atualizarOrcamento(id, {
        itens: linhasValidas.map((linha, idx) => ({
          ...(linha.id ? { id: linha.id } : {}),
          ordem: idx,
          tipo: linha.tipo,
          descricao: linha.descricao.trim(),
          quantidade: linha.quantidade.trim() || '1',
          custo_unitario: linha.custo_unitario.trim() || '0',
          margem_percentual: linha.margem_percentual.trim() || '0',
          preco_unitario: linha.preco_unitario.trim() || '0',
        })),
      })
      setOrcamento(atualizado)
      setLinhasItens(itensParaLinhas(atualizado.itens ?? []))
      showToast({ variant: 'success', message: 'Itens do orçamento guardados.' })
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível guardar os itens.',
      })
    } finally {
      setSalvandoItens(false)
    }
  }

  function adicionarLinha() {
    setLinhasItens((rows) => [
      ...rows,
      {
        ordem: rows.length,
        tipo: 'PRODUTO',
        descricao: '',
        quantidade: '1',
        custo_unitario: '0',
        margem_percentual: orcamento?.margem_produtos_percentual ?? '0',
        preco_unitario: '0',
      },
    ])
  }

  function removerLinha(index: number) {
    setLinhasItens((rows) => rows.filter((_, i) => i !== index))
  }

  function atualizarLinha(index: number, patch: Partial<LinhaEditavel>) {
    setLinhasItens((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  if (!id) {
    return (
      <div className="container-fluid py-4">
        <p className="text-muted">Identificador inválido.</p>
        <Link to="/erp/orcamentos">Voltar à lista</Link>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Módulos</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/erp/orcamentos">Orçamentos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {orcamento?.codigo ?? 'Detalhe'}
          </li>
        </ol>
      </nav>

      {carregando ? (
        <p className="text-muted">A carregar…</p>
      ) : !orcamento ? (
        <p className="text-muted mb-0">
          Orçamento não encontrado.{' '}
          <Link to="/erp/orcamentos">Voltar à lista</Link>
        </p>
      ) : (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body">
                <h1 className="h5 mb-3">Dados do orçamento</h1>
                <form onSubmit={(e) => void handleSalvarCabecalho(e)} className="vstack gap-3">
                  <div>
                    <label className="form-label" htmlFor="orc-det-codigo">
                      Código
                    </label>
                    <input
                      id="orc-det-codigo"
                      className="form-control"
                      value={orcamento.codigo}
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="orc-det-titulo">
                      Título
                    </label>
                    <input
                      id="orc-det-titulo"
                      className="form-control"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      maxLength={200}
                      required
                      disabled={!podeEditar}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="orc-det-desc">
                      Descrição
                    </label>
                    <textarea
                      id="orc-det-desc"
                      className="form-control"
                      rows={3}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      disabled={!podeEditar}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="orc-det-cliente">
                      Cliente
                    </label>
                    <select
                      id="orc-det-cliente"
                      className="form-select"
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      disabled={!podeEditar}
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
                    <label className="form-label" htmlFor="orc-det-contato">
                      Contato do cliente
                    </label>
                    <select
                      id="orc-det-contato"
                      className="form-select"
                      value={contatoId}
                      onChange={(e) => setContatoId(e.target.value)}
                      disabled={!podeEditar || !clienteId || contatos.length === 0}
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
                    <label className="form-label" htmlFor="orc-det-status">
                      Estado
                    </label>
                    <select
                      id="orc-det-status"
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={!podeEditar}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="orc-det-valido">
                      Válido até
                    </label>
                    <input
                      id="orc-det-valido"
                      type="date"
                      className="form-control"
                      value={validoAte}
                      onChange={(e) => setValidoAte(e.target.value)}
                      disabled={!podeEditar}
                    />
                  </div>
                  {podeEditar ? (
                    <button type="submit" className="btn btn-primary" disabled={salvando}>
                      {salvando ? 'A guardar…' : 'Guardar dados'}
                    </button>
                  ) : (
                    <p className="text-muted small mb-0">Só visualização.</p>
                  )}
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <h2 className="h5 mb-1">Itens</h2>
                    <p className="text-muted small mb-0">
                      Edite linhas, adicione novas ou remova. Guarde para sincronizar com o servidor.
                    </p>
                  </div>
                  {podeEditar ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={adicionarLinha}
                      disabled={salvandoItens}
                    >
                      + Linha
                    </button>
                  ) : null}
                </div>

                {linhasItens.length === 0 ? (
                  <p className="text-muted mb-3">Sem linhas. Adicione itens ao orçamento.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th style={{ minWidth: '8rem' }}>#</th>
                          <th style={{ width: '8rem' }}>Tipo</th>
                          <th>Descrição</th>
                          <th className="text-end" style={{ width: '7rem' }}>
                            Qtd
                          </th>
                          <th className="text-end" style={{ width: '8rem' }}>
                            Custo
                          </th>
                          <th className="text-end" style={{ width: '7rem' }}>
                            Margem %
                          </th>
                          <th className="text-end" style={{ width: '8rem' }}>
                            Preço unit.
                          </th>
                          <th className="text-end" style={{ width: '8rem' }}>
                            Subtotal
                          </th>
                          {podeEditar ? (
                            <th className="text-end" style={{ width: '4rem' }} aria-label="Remover" />
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {linhasItens.map((linha, index) => {
                          const q = parseDecimalPt(linha.quantidade)
                          const p = parseDecimalPt(linha.preco_unitario)
                          const sub =
                            Number.isFinite(q) && Number.isFinite(p)
                              ? (q * p).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : '—'
                          return (
                            <tr key={linha.id ?? `nova-${index}`}>
                              <td className="text-muted">{index + 1}</td>
                              <td>
                                {podeEditar ? (
                                  <select
                                    className="form-select form-select-sm"
                                    value={linha.tipo}
                                    onChange={(e) =>
                                      atualizarLinha(index, {
                                        tipo: e.target.value as 'PRODUTO' | 'SERVICO',
                                        margem_percentual:
                                          e.target.value === 'SERVICO'
                                            ? orcamento.margem_servicos_percentual
                                            : orcamento.margem_produtos_percentual,
                                      })
                                    }
                                    disabled={salvandoItens}
                                  >
                                    <option value="PRODUTO">Produto</option>
                                    <option value="SERVICO">Serviço</option>
                                  </select>
                                ) : (
                                  linha.tipo
                                )}
                              </td>
                              <td>
                                {podeEditar ? (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={linha.descricao}
                                    onChange={(e) =>
                                      atualizarLinha(index, { descricao: e.target.value })
                                    }
                                    maxLength={500}
                                    placeholder="Descrição do item"
                                    disabled={salvandoItens}
                                  />
                                ) : (
                                  linha.descricao
                                )}
                              </td>
                              <td>
                                {podeEditar ? (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-end"
                                    value={linha.quantidade}
                                    onChange={(e) =>
                                      atualizarLinha(index, { quantidade: e.target.value })
                                    }
                                    disabled={salvandoItens}
                                    inputMode="decimal"
                                  />
                                ) : (
                                  <span className="d-block text-end">{linha.quantidade}</span>
                                )}
                              </td>
                              <td>
                                {podeEditar ? (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-end"
                                    value={linha.custo_unitario}
                                    onChange={(e) =>
                                      atualizarLinha(index, { custo_unitario: e.target.value })
                                    }
                                    disabled={salvandoItens}
                                    inputMode="decimal"
                                  />
                                ) : (
                                  <span className="d-block text-end">{linha.custo_unitario}</span>
                                )}
                              </td>
                              <td>
                                {podeEditar ? (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-end"
                                    value={linha.margem_percentual}
                                    onChange={(e) =>
                                      atualizarLinha(index, { margem_percentual: e.target.value })
                                    }
                                    disabled={salvandoItens}
                                    inputMode="decimal"
                                  />
                                ) : (
                                  <span className="d-block text-end">
                                    {linha.margem_percentual}
                                  </span>
                                )}
                              </td>
                              <td>
                                {podeEditar ? (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-end"
                                    value={linha.preco_unitario}
                                    onChange={(e) =>
                                      atualizarLinha(index, { preco_unitario: e.target.value })
                                    }
                                    disabled={salvandoItens}
                                    inputMode="decimal"
                                  />
                                ) : (
                                  <span className="d-block text-end">{linha.preco_unitario}</span>
                                )}
                              </td>
                              <td className="text-end">{sub}</td>
                              {podeEditar ? (
                                <td className="text-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link text-danger p-0"
                                    onClick={() => removerLinha(index)}
                                    disabled={salvandoItens}
                                    aria-label="Remover linha"
                                  >
                                    Remover
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={7} className="text-end fw-semibold">
                            Total
                          </td>
                          <td className="text-end fw-semibold">
                            {totalOrcamento.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          {podeEditar ? <td /> : null}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {podeEditar ? (
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={salvandoItens || linhasItens.length === 0}
                      onClick={() => void handleSalvarItens()}
                    >
                      {salvandoItens ? 'A guardar itens…' : 'Guardar itens'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
