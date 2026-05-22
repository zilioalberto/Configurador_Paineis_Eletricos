import {
  type Dispatch,
  type FormEventHandler,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link, useParams } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import {
  contatoIdValidoParaLista,
  useOrcamentoContatosCliente,
} from '../hooks/useOrcamentoContatosCliente'
import {
  atualizarOrcamento,
  listarClientesOrcamento,
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

  const sincronizarContatoAposContatos = useCallback(
    (dados: ContatoClienteDto[]) => {
      if (dados.length === 0) {
        setContatoId('')
        return
      }
      setContatoId((atual) => contatoIdValidoParaLista(atual, dados))
    },
    []
  )

  const contatos = useOrcamentoContatosCliente(
    clienteId,
    showToast,
    sincronizarContatoAposContatos
  )

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

  const handleSalvarCabecalho: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void salvarCabecalhoAsync()
  }

  async function salvarCabecalhoAsync() {
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

      <OrcamentoDetalheConteudo
        adicionarLinha={adicionarLinha}
        atualizarLinha={atualizarLinha}
        carregando={carregando}
        clienteId={clienteId}
        clientes={clientes}
        contatoId={contatoId}
        contatos={contatos}
        descricao={descricao}
        linhasItens={linhasItens}
        orcamento={orcamento}
        podeEditar={podeEditar}
        removerLinha={removerLinha}
        salvando={salvando}
        salvandoItens={salvandoItens}
        status={status}
        titulo={titulo}
        totalOrcamento={totalOrcamento}
        validoAte={validoAte}
        onSalvarCabecalho={handleSalvarCabecalho}
        onSalvarItens={handleSalvarItens}
        setClienteId={setClienteId}
        setContatoId={setContatoId}
        setDescricao={setDescricao}
        setStatus={setStatus}
        setTitulo={setTitulo}
        setValidoAte={setValidoAte}
      />
    </div>
  )
}

type OrcamentoDetalheConteudoProps = {
  adicionarLinha: () => void
  atualizarLinha: (index: number, patch: Partial<LinhaEditavel>) => void
  carregando: boolean
  clienteId: string
  clientes: ParceiroClienteDto[]
  contatoId: string
  contatos: ContatoClienteDto[]
  descricao: string
  linhasItens: LinhaEditavel[]
  orcamento: OrcamentoDto | null
  podeEditar: boolean
  removerLinha: (index: number) => void
  salvando: boolean
  salvandoItens: boolean
  status: string
  titulo: string
  totalOrcamento: number
  validoAte: string
  onSalvarCabecalho: FormEventHandler<HTMLFormElement>
  onSalvarItens: () => void | Promise<void>
  setClienteId: Dispatch<SetStateAction<string>>
  setContatoId: Dispatch<SetStateAction<string>>
  setDescricao: Dispatch<SetStateAction<string>>
  setStatus: Dispatch<SetStateAction<string>>
  setTitulo: Dispatch<SetStateAction<string>>
  setValidoAte: Dispatch<SetStateAction<string>>
}

function OrcamentoDetalheConteudo({
  carregando,
  orcamento,
  ...props
}: Readonly<OrcamentoDetalheConteudoProps>) {
  if (carregando) return <p className="text-muted">A carregar…</p>
  if (orcamento) return <OrcamentoEdicao orcamento={orcamento} {...props} />

  return (
    <p className="text-muted mb-0">
      Orçamento não encontrado. <Link to="/erp/orcamentos">Voltar à lista</Link>
    </p>
  )
}

function OrcamentoEdicao({
  adicionarLinha,
  atualizarLinha,
  clienteId,
  clientes,
  contatoId,
  contatos,
  descricao,
  linhasItens,
  orcamento,
  podeEditar,
  removerLinha,
  salvando,
  salvandoItens,
  status,
  titulo,
  totalOrcamento,
  validoAte,
  onSalvarCabecalho,
  onSalvarItens,
  setClienteId,
  setContatoId,
  setDescricao,
  setStatus,
  setTitulo,
  setValidoAte,
}: Readonly<Omit<OrcamentoDetalheConteudoProps, 'carregando' | 'orcamento'> & {
  orcamento: OrcamentoDto
}>) {
  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <OrcamentoDadosCard
          clienteId={clienteId}
          clientes={clientes}
          contatoId={contatoId}
          contatos={contatos}
          descricao={descricao}
          orcamento={orcamento}
          podeEditar={podeEditar}
          salvando={salvando}
          status={status}
          titulo={titulo}
          validoAte={validoAte}
          onSalvarCabecalho={onSalvarCabecalho}
          setClienteId={setClienteId}
          setContatoId={setContatoId}
          setDescricao={setDescricao}
          setStatus={setStatus}
          setTitulo={setTitulo}
          setValidoAte={setValidoAte}
        />
      </div>
      <div className="col-lg-7">
        <OrcamentoItensCard
          adicionarLinha={adicionarLinha}
          atualizarLinha={atualizarLinha}
          linhasItens={linhasItens}
          orcamento={orcamento}
          podeEditar={podeEditar}
          removerLinha={removerLinha}
          salvandoItens={salvandoItens}
          totalOrcamento={totalOrcamento}
          onSalvarItens={onSalvarItens}
        />
      </div>
    </div>
  )
}

function OrcamentoDadosCard({
  clienteId,
  clientes,
  contatoId,
  contatos,
  descricao,
  orcamento,
  podeEditar,
  salvando,
  status,
  titulo,
  validoAte,
  onSalvarCabecalho,
  setClienteId,
  setContatoId,
  setDescricao,
  setStatus,
  setTitulo,
  setValidoAte,
}: Readonly<{
  clienteId: string
  clientes: ParceiroClienteDto[]
  contatoId: string
  contatos: ContatoClienteDto[]
  descricao: string
  orcamento: OrcamentoDto
  podeEditar: boolean
  salvando: boolean
  status: string
  titulo: string
  validoAte: string
  onSalvarCabecalho: FormEventHandler<HTMLFormElement>
  setClienteId: Dispatch<SetStateAction<string>>
  setContatoId: Dispatch<SetStateAction<string>>
  setDescricao: Dispatch<SetStateAction<string>>
  setStatus: Dispatch<SetStateAction<string>>
  setTitulo: Dispatch<SetStateAction<string>>
  setValidoAte: Dispatch<SetStateAction<string>>
}>) {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h1 className="h5 mb-3">Dados do orçamento</h1>
        <form onSubmit={onSalvarCabecalho} className="vstack gap-3">
          <div>
            <label className="form-label" htmlFor="orc-det-codigo">
              Código
            </label>
            <input id="orc-det-codigo" className="form-control" value={orcamento.codigo} readOnly disabled />
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
          <OrcamentoClienteSelect
            clienteId={clienteId}
            clientes={clientes}
            contatoId={contatoId}
            contatos={contatos}
            podeEditar={podeEditar}
            setClienteId={setClienteId}
            setContatoId={setContatoId}
          />
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
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
          <OrcamentoDadosSubmit podeEditar={podeEditar} salvando={salvando} />
        </form>
      </div>
    </div>
  )
}

function OrcamentoClienteSelect({
  clienteId,
  clientes,
  contatoId,
  contatos,
  podeEditar,
  setClienteId,
  setContatoId,
}: Readonly<{
  clienteId: string
  clientes: ParceiroClienteDto[]
  contatoId: string
  contatos: ContatoClienteDto[]
  podeEditar: boolean
  setClienteId: Dispatch<SetStateAction<string>>
  setContatoId: Dispatch<SetStateAction<string>>
}>) {
  return (
    <>
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
              {contatoOptionLabel(contato)}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

function contatoOptionLabel(contato: ContatoClienteDto): string {
  return contato.email ? `${contato.nome} (${contato.email})` : contato.nome
}

function OrcamentoDadosSubmit({
  podeEditar,
  salvando,
}: Readonly<{
  podeEditar: boolean
  salvando: boolean
}>) {
  if (podeEditar) {
    return (
      <button type="submit" className="btn btn-primary" disabled={salvando}>
        {salvando ? 'A guardar…' : 'Guardar dados'}
      </button>
    )
  }
  return <p className="text-muted small mb-0">Só visualização.</p>
}

function OrcamentoItensCard({
  adicionarLinha,
  atualizarLinha,
  linhasItens,
  orcamento,
  podeEditar,
  removerLinha,
  salvandoItens,
  totalOrcamento,
  onSalvarItens,
}: Readonly<{
  adicionarLinha: () => void
  atualizarLinha: (index: number, patch: Partial<LinhaEditavel>) => void
  linhasItens: LinhaEditavel[]
  orcamento: OrcamentoDto
  podeEditar: boolean
  removerLinha: (index: number) => void
  salvandoItens: boolean
  totalOrcamento: number
  onSalvarItens: () => void | Promise<void>
}>) {
  return (
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

        <OrcamentoItensTable
          atualizarLinha={atualizarLinha}
          linhasItens={linhasItens}
          orcamento={orcamento}
          podeEditar={podeEditar}
          removerLinha={removerLinha}
          salvandoItens={salvandoItens}
          totalOrcamento={totalOrcamento}
        />

        {podeEditar ? (
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={salvandoItens || linhasItens.length === 0}
              onClick={() => void onSalvarItens()}
            >
              {salvandoItens ? 'A guardar itens…' : 'Guardar itens'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function OrcamentoItensTable({
  atualizarLinha,
  linhasItens,
  orcamento,
  podeEditar,
  removerLinha,
  salvandoItens,
  totalOrcamento,
}: Readonly<{
  atualizarLinha: (index: number, patch: Partial<LinhaEditavel>) => void
  linhasItens: LinhaEditavel[]
  orcamento: OrcamentoDto
  podeEditar: boolean
  removerLinha: (index: number) => void
  salvandoItens: boolean
  totalOrcamento: number
}>) {
  if (linhasItens.length === 0) {
    return <p className="text-muted mb-3">Sem linhas. Adicione itens ao orçamento.</p>
  }

  return (
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
          {linhasItens.map((linha, index) => (
            <OrcamentoItemRow
              key={linha.id ?? `nova-${index}`}
              atualizarLinha={atualizarLinha}
              index={index}
              linha={linha}
              orcamento={orcamento}
              podeEditar={podeEditar}
              removerLinha={removerLinha}
              salvandoItens={salvandoItens}
            />
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={7} className="text-end fw-semibold">
              Total
            </td>
            <td className="text-end fw-semibold">{valorMonetarioTabela(totalOrcamento)}</td>
            {podeEditar ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function OrcamentoItemRow({
  atualizarLinha,
  index,
  linha,
  orcamento,
  podeEditar,
  removerLinha,
  salvandoItens,
}: Readonly<{
  atualizarLinha: (index: number, patch: Partial<LinhaEditavel>) => void
  index: number
  linha: LinhaEditavel
  orcamento: OrcamentoDto
  podeEditar: boolean
  removerLinha: (index: number) => void
  salvandoItens: boolean
}>) {
  return (
    <tr>
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
      <OrcamentoCampoLinha
        alinhadoDireita={false}
        campo="descricao"
        index={index}
        linha={linha}
        podeEditar={podeEditar}
        salvandoItens={salvandoItens}
        atualizarLinha={atualizarLinha}
        maxLength={500}
        placeholder="Descrição do item"
      />
      <OrcamentoCampoLinha campo="quantidade" index={index} linha={linha} podeEditar={podeEditar} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <OrcamentoCampoLinha campo="custo_unitario" index={index} linha={linha} podeEditar={podeEditar} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <OrcamentoCampoLinha campo="margem_percentual" index={index} linha={linha} podeEditar={podeEditar} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <OrcamentoCampoLinha campo="preco_unitario" index={index} linha={linha} podeEditar={podeEditar} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <td className="text-end">{subtotalLinha(linha)}</td>
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
}

function OrcamentoCampoLinha({
  alinhadoDireita = true,
  campo,
  index,
  linha,
  maxLength,
  placeholder,
  podeEditar,
  salvandoItens,
  atualizarLinha,
}: Readonly<{
  alinhadoDireita?: boolean
  campo: keyof Pick<
    LinhaEditavel,
    'descricao' | 'quantidade' | 'custo_unitario' | 'margem_percentual' | 'preco_unitario'
  >
  index: number
  linha: LinhaEditavel
  maxLength?: number
  placeholder?: string
  podeEditar: boolean
  salvandoItens: boolean
  atualizarLinha: (index: number, patch: Partial<LinhaEditavel>) => void
}>) {
  if (podeEditar) {
    return (
      <td>
        <input
          type="text"
          className={`form-control form-control-sm${alinhadoDireita ? ' text-end' : ''}`}
          value={linha[campo]}
          onChange={(e) => atualizarLinha(index, { [campo]: e.target.value })}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={salvandoItens}
          inputMode={alinhadoDireita ? 'decimal' : undefined}
        />
      </td>
    )
  }

  return (
    <td>
      <span className={alinhadoDireita ? 'd-block text-end' : ''}>{linha[campo]}</span>
    </td>
  )
}

function subtotalLinha(linha: LinhaEditavel): string {
  const quantidade = parseDecimalPt(linha.quantidade)
  const preco = parseDecimalPt(linha.preco_unitario)
  if (!Number.isFinite(quantidade) || !Number.isFinite(preco)) return '—'
  return valorMonetarioTabela(quantidade * preco)
}

function valorMonetarioTabela(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
