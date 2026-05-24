/**
 * Detalhe da proposta: cabeçalho, linhas editáveis, totais e sync de itens no PATCH.
 */
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

import OrcamentoCatalogoItemForm from '../components/OrcamentoCatalogoItemForm'
import OrcamentoLinhaDescricaoCampo from '../components/OrcamentoLinhaDescricaoCampo'
import OrcamentoPainelsCard from '../components/OrcamentoPainelsCard'
import { atualizarOrcamento, obterOrcamento } from '../services/erpApi'
import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import type { OrcamentoDto, OrcamentoItemDto } from '../types/erp'
import {
  clampMargemParaCima,
  parseDecimalPt,
  toDateInputValue,
  validadePadraoProposta,
} from '../utils/orcamentoUi'
import { calcularPrecoUnitarioLinha } from '../utils/orcamentoPrecoLinha'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

function itensParaLinhas(itens: OrcamentoItemDto[]): LinhaEditavelOrcamento[] {
  return [...itens]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item, idx) => {
      const custo = String(item.custo_unitario ?? '0')
      const margem = String(item.margem_percentual ?? '0')
      const aliquota_ipi =
        item.aliquota_ipi != null && item.aliquota_ipi !== ''
          ? String(item.aliquota_ipi)
          : null
      return {
        id: item.id,
        ordem: idx,
        tipo: item.tipo ?? 'PRODUTO',
        editavel: item.editavel !== false,
        origem: item.origem,
        produtoId: item.produto ?? undefined,
        produtoCodigo: item.produto_codigo ?? undefined,
        descricao: item.descricao,
        quantidade: String(item.quantidade),
        custo_unitario: custo,
        margem_percentual: margem,
        margem_minima: margem,
        aliquota_ipi,
        preco_unitario: calcularPrecoUnitarioLinha(custo, margem, aliquota_ipi),
      }
    })
}

function formatIpiExibicao(valor: string | null | undefined): string {
  if (valor == null || valor === '') return '—'
  const n = Number(String(valor).replace(',', '.'))
  if (!Number.isFinite(n)) return valor
  return `${n} %`
}

/** Formulário completo de edição de orçamento existente. */
export default function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const { user } = useAuth()
  const podeEditarPerm = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_EDITAR)

  const [orcamento, setOrcamento] = useState<OrcamentoDto | null>(null)
  const podeEditar = podeEditarPerm && (orcamento?.editavel !== false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoItens, setSalvandoItens] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState('RASCUNHO')
  const [validoAte, setValidoAte] = useState('')
  const [margemProdutos, setMargemProdutos] = useState('0')
  const [margemServicos, setMargemServicos] = useState('0')
  const [margemProdutosMin, setMargemProdutosMin] = useState('0')
  const [margemServicosMin, setMargemServicosMin] = useState('0')
  const [linhasItens, setLinhasItens] = useState<LinhaEditavelOrcamento[]>([])

  const recarregar = useCallback(async () => {
    if (!id) return
    setCarregando(true)
    try {
      const dados = await obterOrcamento(id)
      setOrcamento(dados)
      setTitulo(dados.titulo)
      setDescricao(dados.descricao ?? '')
      setStatus(dados.status)
      setValidoAte(
        toDateInputValue(dados.valido_ate) || validadePadraoProposta()
      )
      const mp = String(dados.margem_produtos_percentual ?? '0')
      const ms = String(dados.margem_servicos_percentual ?? '0')
      setMargemProdutos(mp)
      setMargemServicos(ms)
      setMargemProdutosMin(mp)
      setMargemServicosMin(ms)
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
        status,
        valido_ate: validoAte.trim() ? validoAte.trim() : null,
        margem_produtos_percentual: clampMargemParaCima(
          margemProdutos.trim() || '0',
          margemProdutosMin
        ),
        margem_servicos_percentual: clampMargemParaCima(
          margemServicos.trim() || '0',
          margemServicosMin
        ),
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
          ...(linha.origem ? { origem: linha.origem as 'MANUAL' | 'CATALOGO' | 'CONFIGURADOR' } : {}),
          ...(linha.produtoId ? { produto: linha.produtoId } : {}),
          descricao: linha.descricao.trim(),
          quantidade: linha.quantidade.trim() || '1',
          custo_unitario: linha.custo_unitario.trim() || '0',
          margem_percentual: clampMargemParaCima(
            linha.margem_percentual.trim() || '0',
            linha.margem_minima ?? linha.margem_percentual
          ),
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
        origem: 'MANUAL',
        editavel: true,
        descricao: '',
        quantidade: '1',
        custo_unitario: '0',
        margem_percentual: margemProdutos || '0',
        margem_minima: margemProdutos || '0',
        preco_unitario: '0',
      },
    ])
  }

  function alterarMargemProdutos(valor: string) {
    setMargemProdutos(clampMargemParaCima(valor, margemProdutosMin))
  }

  function alterarMargemServicos(valor: string) {
    setMargemServicos(clampMargemParaCima(valor, margemServicosMin))
  }

  function adicionarLinhaCatalogo(linha: LinhaEditavelOrcamento) {
    setLinhasItens((rows) => [...rows, { ...linha, ordem: rows.length }])
  }

  function removerLinha(index: number) {
    setLinhasItens((rows) => rows.filter((_, i) => i !== index))
  }

  function atualizarLinha(index: number, patch: Partial<LinhaEditavelOrcamento>) {
    setLinhasItens((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row
        const merged = { ...row, ...patch }
        if (patch.margem_percentual !== undefined) {
          merged.margem_percentual = clampMargemParaCima(
            patch.margem_percentual,
            row.margem_minima ?? row.margem_percentual
          )
        }
        if (patch.tipo !== undefined && patch.margem_percentual === undefined) {
          const margemCab =
            patch.tipo === 'SERVICO' ? margemServicos : margemProdutos
          merged.margem_percentual = margemCab
          merged.margem_minima = margemCab
        }
        merged.preco_unitario = calcularPrecoUnitarioLinha(
          merged.custo_unitario,
          merged.margem_percentual,
          merged.aliquota_ipi
        )
        return merged
      })
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
        adicionarLinhaCatalogo={adicionarLinhaCatalogo}
        atualizarLinha={atualizarLinha}
        margemProdutos={margemProdutos}
        margemServicos={margemServicos}
        alterarMargemProdutos={alterarMargemProdutos}
        alterarMargemServicos={alterarMargemServicos}
        carregando={carregando}
        descricao={descricao}
        margemProdutosMin={margemProdutosMin}
        margemServicosMin={margemServicosMin}
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
        onOrcamentoAtualizado={(dados) => {
          setOrcamento(dados)
          setLinhasItens(itensParaLinhas(dados.itens ?? []))
        }}
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
  adicionarLinhaCatalogo: (linha: LinhaEditavelOrcamento) => void
  alterarMargemProdutos: (valor: string) => void
  alterarMargemServicos: (valor: string) => void
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  margemProdutos: string
  margemServicos: string
  margemProdutosMin: string
  margemServicosMin: string
  carregando: boolean
  descricao: string
  linhasItens: LinhaEditavelOrcamento[]
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
  onOrcamentoAtualizado: (orcamento: OrcamentoDto) => void
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
  adicionarLinhaCatalogo,
  alterarMargemProdutos,
  alterarMargemServicos,
  atualizarLinha,
  descricao,
  linhasItens,
  margemProdutos,
  margemServicos,
  margemProdutosMin,
  margemServicosMin,
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
  onOrcamentoAtualizado,
  setDescricao,
  setStatus,
  setTitulo,
  setValidoAte,
}: Readonly<Omit<OrcamentoDetalheConteudoProps, 'carregando' | 'orcamento'> & {
  orcamento: OrcamentoDto
}>) {
  return (
    <div className="vstack gap-4">
      <OrcamentoDadosCard
        alterarMargemProdutos={alterarMargemProdutos}
        alterarMargemServicos={alterarMargemServicos}
        descricao={descricao}
        margemProdutos={margemProdutos}
        margemServicos={margemServicos}
        margemProdutosMin={margemProdutosMin}
        margemServicosMin={margemServicosMin}
        orcamento={orcamento}
        podeEditar={podeEditar}
        salvando={salvando}
        status={status}
        titulo={titulo}
        validoAte={validoAte}
        onSalvarCabecalho={onSalvarCabecalho}
        setDescricao={setDescricao}
        setStatus={setStatus}
        setTitulo={setTitulo}
        setValidoAte={setValidoAte}
      />
      <OrcamentoItensCard
        adicionarLinha={adicionarLinha}
        adicionarLinhaCatalogo={adicionarLinhaCatalogo}
        margemProdutos={margemProdutos}
        atualizarLinha={atualizarLinha}
        linhasItens={linhasItens}
        orcamento={orcamento}
        podeEditar={podeEditar}
        removerLinha={removerLinha}
        salvandoItens={salvandoItens}
        totalOrcamento={totalOrcamento}
        onSalvarItens={onSalvarItens}
      />
      <OrcamentoPainelsCard
        orcamento={orcamento}
        podeEditar={podeEditar}
        onAtualizado={onOrcamentoAtualizado}
      />
    </div>
  )
}

function OrcamentoDadosCard({
  alterarMargemProdutos,
  alterarMargemServicos,
  descricao,
  margemProdutos,
  margemServicos,
  margemProdutosMin,
  margemServicosMin,
  orcamento,
  podeEditar,
  salvando,
  status,
  titulo,
  validoAte,
  onSalvarCabecalho,
  setDescricao,
  setStatus,
  setTitulo,
  setValidoAte,
}: Readonly<{
  alterarMargemProdutos: (valor: string) => void
  alterarMargemServicos: (valor: string) => void
  descricao: string
  margemProdutos: string
  margemServicos: string
  margemProdutosMin: string
  margemServicosMin: string
  orcamento: OrcamentoDto
  podeEditar: boolean
  salvando: boolean
  status: string
  titulo: string
  validoAte: string
  onSalvarCabecalho: FormEventHandler<HTMLFormElement>
  setDescricao: Dispatch<SetStateAction<string>>
  setStatus: Dispatch<SetStateAction<string>>
  setTitulo: Dispatch<SetStateAction<string>>
  setValidoAte: Dispatch<SetStateAction<string>>
}>) {
  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === orcamento.status)?.label ?? orcamento.status

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <p className="text-muted small mb-1">Proposta comercial</p>
            <h1 className="h4 mb-0">{orcamento.codigo}</h1>
          </div>
          <span className="badge text-bg-secondary">{statusLabel}</span>
        </div>

        <form onSubmit={onSalvarCabecalho}>
          <div className="row g-3">
            <div className="col-md-6 col-lg-4">
              <label className="form-label text-muted small mb-1">Cliente</label>
              <p className="mb-0 fw-semibold">{orcamento.cliente_nome || '—'}</p>
              {orcamento.contato_cliente_nome ? (
                <p className="small text-muted mb-0 mt-1">
                  {orcamento.contato_cliente_nome}
                  {orcamento.contato_cliente_email
                    ? ` · ${orcamento.contato_cliente_email}`
                    : ''}
                </p>
              ) : null}
            </div>
            <div className="col-md-6 col-lg-4">
              <label className="form-label" htmlFor="orc-det-titulo">
                Título da proposta
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
            <div className="col-md-6 col-lg-4">
              <label className="form-label" htmlFor="orc-det-valido">
                Validade da oferta
              </label>
              <input
                id="orc-det-valido"
                type="date"
                className="form-control"
                value={validoAte}
                onChange={(e) => setValidoAte(e.target.value)}
                disabled={!podeEditar}
              />
              <div className="form-text">Padrão: 15 dias a partir da criação (editável).</div>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="orc-det-desc">
                Descrição / escopo
              </label>
              <textarea
                id="orc-det-desc"
                className="form-control"
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={!podeEditar}
              />
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="orc-det-margem-prod">
                Margem produtos (%)
              </label>
              <input
                id="orc-det-margem-prod"
                type="text"
                inputMode="decimal"
                className="form-control"
                value={margemProdutos}
                min={margemProdutosMin}
                onChange={(e) => alterarMargemProdutos(e.target.value)}
                disabled={!podeEditar}
              />
              <div className="form-text">Mín. {margemProdutosMin}% (só aumentar).</div>
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label" htmlFor="orc-det-margem-serv">
                Margem serviços (%)
              </label>
              <input
                id="orc-det-margem-serv"
                type="text"
                inputMode="decimal"
                className="form-control"
                value={margemServicos}
                min={margemServicosMin}
                onChange={(e) => alterarMargemServicos(e.target.value)}
                disabled={!podeEditar}
              />
              <div className="form-text">Mín. {margemServicosMin}% (só aumentar).</div>
            </div>
            <div className="col-md-6 col-lg-3">
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
            <div className="col-12">
              <OrcamentoDadosSubmit podeEditar={podeEditar} salvando={salvando} />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
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
  adicionarLinhaCatalogo,
  margemProdutos,
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
  adicionarLinhaCatalogo: (linha: LinhaEditavelOrcamento) => void
  margemProdutos: string
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  linhasItens: LinhaEditavelOrcamento[]
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
              Edite linhas, adicione novas ou remova. O IPI % vem do catálogo fiscal e não pode ser
              alterado na proposta. Guarde para sincronizar com o servidor.
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

        {podeEditar ? (
          <OrcamentoCatalogoItemForm
            margemProdutos={margemProdutos}
            onAdicionar={adicionarLinhaCatalogo}
            disabled={salvandoItens}
          />
        ) : null}

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
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  linhasItens: LinhaEditavelOrcamento[]
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
    <div className="table-responsive" style={{ overflow: 'visible' }}>
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
            <th className="text-end" style={{ width: '5rem' }} title="Referência do catálogo">
              IPI %
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
            <td colSpan={8} className="text-end fw-semibold">
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
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  index: number
  linha: LinhaEditavelOrcamento
  orcamento: OrcamentoDto
  podeEditar: boolean
  removerLinha: (index: number) => void
  salvandoItens: boolean
}>) {
  const linhaEditavel = podeEditar && linha.editavel !== false
  const historico = linha.origem === 'HERANCA_REVISAO'
  return (
    <tr className={historico ? 'table-secondary' : undefined}>
      <td className="text-muted">
        {index + 1}
        {linha.origem && linha.origem !== 'MANUAL' ? (
          <span className="d-block badge text-bg-light text-dark fw-normal mt-1">
            {linha.origem === 'HERANCA_REVISAO' ? 'Hist.' : linha.origem.slice(0, 4)}
          </span>
        ) : null}
      </td>
      <td>
        {linhaEditavel ? (
          <select
            className="form-select form-select-sm"
            value={linha.tipo}
            onChange={(e) => {
              const tipo = e.target.value as 'PRODUTO' | 'SERVICO'
              const margem =
                tipo === 'SERVICO'
                  ? orcamento.margem_servicos_percentual
                  : orcamento.margem_produtos_percentual
              atualizarLinha(index, {
                tipo,
                margem_percentual: margem,
                margem_minima: margem,
                aliquota_ipi: tipo === 'SERVICO' ? null : linha.aliquota_ipi,
              })
            }}
            disabled={salvandoItens}
          >
            <option value="PRODUTO">Produto</option>
            <option value="SERVICO">Serviço</option>
          </select>
        ) : (
          linha.tipo
        )}
      </td>
      {linhaEditavel && linha.tipo === 'PRODUTO' ? (
        <OrcamentoLinhaDescricaoCampo
          index={index}
          linha={linha}
          margemProdutos={orcamento.margem_produtos_percentual}
          salvandoItens={salvandoItens}
          atualizarLinha={atualizarLinha}
        />
      ) : (
        <OrcamentoCampoLinha
          alinhadoDireita={false}
          campo="descricao"
          index={index}
          linha={linha}
          podeEditar={linhaEditavel}
          salvandoItens={salvandoItens}
          atualizarLinha={atualizarLinha}
          maxLength={500}
          placeholder="Descrição do item"
        />
      )}
      <OrcamentoCampoLinha campo="quantidade" index={index} linha={linha} podeEditar={linhaEditavel} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <OrcamentoCampoLinha campo="custo_unitario" index={index} linha={linha} podeEditar={linhaEditavel} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <td className="text-end text-muted small" title="Definido no catálogo fiscal">
        {formatIpiExibicao(linha.aliquota_ipi)}
      </td>
      <OrcamentoCampoLinha
        campo="margem_percentual"
        index={index}
        linha={linha}
        podeEditar={linhaEditavel}
        salvandoItens={salvandoItens}
        atualizarLinha={atualizarLinha}
        tituloMargemMinima={`Mínimo ${linha.margem_minima ?? linha.margem_percentual}%`}
      />
      <td className="text-end">{precoLinhaExibicao(linha)}</td>
      <td className="text-end">{subtotalLinha(linha)}</td>
      {linhaEditavel ? (
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
  tituloMargemMinima,
}: Readonly<{
  alinhadoDireita?: boolean
  campo: keyof Pick<
    LinhaEditavelOrcamento,
    'descricao' | 'quantidade' | 'custo_unitario' | 'margem_percentual' | 'preco_unitario'
  >
  index: number
  linha: LinhaEditavelOrcamento
  maxLength?: number
  placeholder?: string
  podeEditar: boolean
  salvandoItens: boolean
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  tituloMargemMinima?: string
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
          title={campo === 'margem_percentual' ? tituloMargemMinima : undefined}
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

function precoLinhaExibicao(linha: LinhaEditavelOrcamento): string {
  const preco = parseDecimalPt(linha.preco_unitario)
  if (!Number.isFinite(preco)) return '—'
  return valorMonetarioTabela(preco)
}

function subtotalLinha(linha: LinhaEditavelOrcamento): string {
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
