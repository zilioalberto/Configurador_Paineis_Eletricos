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

import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import OrcamentoCatalogoItemForm from '../components/OrcamentoCatalogoItemForm'
import OrcamentoLinhaDescricaoCampo from '../components/OrcamentoLinhaDescricaoCampo'
import OrcamentoPainelsCard from '../components/OrcamentoPainelsCard'
import { atualizarOrcamento, obterOrcamento } from '../services/erpApi'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import type { OrcamentoDto, OrcamentoItemDto } from '../types/erp'
import {
  clampMargemParaCima,
  parseDecimalPt,
  toDateInputValue,
  validadePadraoProposta,
} from '../utils/orcamentoUi'
import { calcularPrecoUnitarioLinha } from '../utils/orcamentoPrecoLinha'
import {
  exibirNcmLinhaOrcamento,
  rotuloOrigemLinhaOrcamento,
} from '../utils/orcamentoOrigemLinha'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const ORCAMENTO_DADOS_FORM_ID = 'orcamento-dados-form'

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
        produtoNcm: item.produto_ncm ?? undefined,
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

function produtoComCustoZero(linha: LinhaEditavelOrcamento): boolean {
  if (linha.tipo !== 'PRODUTO') return false
  const custo = parseDecimalPt(linha.custo_unitario || '0')
  return !Number.isFinite(custo) || custo <= 0
}

function linhasProdutosComCustoZero(linhas: LinhaEditavelOrcamento[]): number[] {
  return linhas
    .map((linha, index) => (produtoComCustoZero(linha) ? index + 1 : null))
    .filter((index): index is number => index !== null)
}

function precoUnitarioCalculado(linha: LinhaEditavelOrcamento): string {
  return calcularPrecoUnitarioLinha(
    linha.custo_unitario,
    linha.margem_percentual,
    linha.aliquota_ipi
  )
}

function decimalPayload(valor: string, fallback: string, casasDecimais = 4): string {
  const n = parseDecimalPt(valor.trim() || fallback)
  if (!Number.isFinite(n)) return fallback
  return n
    .toFixed(casasDecimais)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

/** Formulário completo de edição de orçamento existente. */
export default function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const { user } = useAuth()
  const podeEditarPerm = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_EDITAR)

  const [orcamento, setOrcamento] = useState<OrcamentoDto | null>(null)
  const podeEditar = podeEditarPerm && (orcamento?.editavel !== false)
  const motivoBloqueioEdicao = !podeEditarPerm
    ? 'Seu utilizador não possui permissão para editar orçamentos.'
    : orcamento?.editavel === false
      ? 'Esta proposta não está em rascunho. Apenas propostas em rascunho podem ser alteradas.'
      : null
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
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível carregar o orçamento.',
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

  const linhasComCustoZero = useMemo(
    () => linhasProdutosComCustoZero(linhasItens.filter((linha) => linha.editavel !== false)),
    [linhasItens]
  )

  const toolbarConfig = useMemo(
    () => ({
      title: orcamento?.codigo ?? 'Proposta comercial',
      subtitle: orcamento
        ? [orcamento.titulo, orcamento.cliente_nome].filter(Boolean).join(' · ')
        : 'Carregando proposta',
      back: { to: '/orcamentos', label: 'Orçamentos' },
      badges: orcamento
        ? [
            { key: 'status', text: orcamento.status },
            { key: 'itens', text: `${linhasItens.length} item(ns)` },
            ...(orcamento.snapshot_envio
              ? [{ key: 'snapshot', text: 'Oferta congelada', variant: 'light' as const }]
              : []),
          ]
        : undefined,
      primaryAction: podeEditar
        ? {
            label: 'Guardar dados',
            formId: ORCAMENTO_DADOS_FORM_ID,
            loading: salvando,
            loadingLabel: 'Guardando…',
          }
        : undefined,
    }),
    [linhasItens.length, orcamento, podeEditar, salvando]
  )

  useAppPageToolbar(toolbarConfig)

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
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível guardar as alterações.',
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
    const linhasEditaveis = linhasValidas.filter((linha) => linha.editavel !== false)
    const linhasSemCusto = linhasProdutosComCustoZero(linhasEditaveis)
    if (linhasSemCusto.length > 0) {
      showToast({
        variant: 'danger',
        title: 'Custo obrigatório',
        message: `Informe custo maior que zero nas linhas de produto: ${linhasSemCusto.join(', ')}.`,
      })
      return
    }
    setSalvandoItens(true)
    try {
      const atualizado = await atualizarOrcamento(id, {
        itens: linhasEditaveis.map((linha, idx) => ({
          ...(linha.id ? { id: linha.id } : {}),
          ordem: idx,
          tipo: linha.tipo,
          ...(linha.origem ? { origem: linha.origem as 'MANUAL' | 'CATALOGO' | 'CONFIGURADOR' } : {}),
          ...(linha.produtoId ? { produto: linha.produtoId } : {}),
          descricao: linha.descricao.trim(),
          quantidade: decimalPayload(linha.quantidade, '1'),
          custo_unitario: decimalPayload(linha.custo_unitario, '0'),
          margem_percentual: decimalPayload(
            clampMargemParaCima(
              linha.margem_percentual.trim() || '0',
              linha.margem_minima ?? linha.margem_percentual
            ),
            '0',
            2
          ),
        })),
      })
      setOrcamento(atualizado)
      setLinhasItens(itensParaLinhas(atualizado.itens ?? []))
      showToast({ variant: 'success', message: 'Itens do orçamento guardados.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível guardar os itens.',
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
        <Link to="/orcamentos">Voltar à lista</Link>
      </div>
    )
  }

  return (
    <div className="container-fluid py-3">
      <OrcamentoDetalheConteudo
        adicionarLinha={adicionarLinha}
        adicionarLinhaCatalogo={adicionarLinhaCatalogo}
        atualizarLinha={atualizarLinha}
        margemProdutos={margemProdutos}
        carregando={carregando}
        descricao={descricao}
        linhasComCustoZero={linhasComCustoZero}
        linhasItens={linhasItens}
        motivoBloqueioEdicao={motivoBloqueioEdicao}
        orcamento={orcamento}
        podeEditar={podeEditar}
        removerLinha={removerLinha}
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
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  margemProdutos: string
  linhasComCustoZero: number[]
  carregando: boolean
  descricao: string
  linhasItens: LinhaEditavelOrcamento[]
  motivoBloqueioEdicao: string | null
  orcamento: OrcamentoDto | null
  podeEditar: boolean
  removerLinha: (index: number) => void
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
      Orçamento não encontrado. <Link to="/orcamentos">Voltar à lista</Link>
    </p>
  )
}

function OrcamentoEdicao({
  adicionarLinha,
  adicionarLinhaCatalogo,
  atualizarLinha,
  descricao,
  linhasComCustoZero,
  linhasItens,
  motivoBloqueioEdicao,
  margemProdutos,
  orcamento,
  podeEditar,
  removerLinha,
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
      {motivoBloqueioEdicao ? (
        <div className="alert alert-warning mb-0" role="alert">
          {motivoBloqueioEdicao}
        </div>
      ) : null}
      <OrcamentoDadosCard
        descricao={descricao}
        orcamento={orcamento}
        podeEditar={podeEditar}
        status={status}
        titulo={titulo}
        validoAte={validoAte}
        onSalvarCabecalho={onSalvarCabecalho}
        setDescricao={setDescricao}
        setStatus={setStatus}
        setTitulo={setTitulo}
        setValidoAte={setValidoAte}
      />
      <OrcamentoRevisoesCard orcamento={orcamento} />
      <OrcamentoItensCard
        adicionarLinha={adicionarLinha}
        adicionarLinhaCatalogo={adicionarLinhaCatalogo}
        margemProdutos={margemProdutos}
        atualizarLinha={atualizarLinha}
        linhasComCustoZero={linhasComCustoZero}
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

function OrcamentoRevisoesCard({ orcamento }: Readonly<{ orcamento: OrcamentoDto }>) {
  const revisoes = orcamento.revisoes_derivadas ?? []
  const temHistorico = Boolean(orcamento.orcamento_origem || revisoes.length > 0 || orcamento.snapshot_envio)
  if (!temHistorico) return null

  return (
    <details className="card shadow-sm border-0" id="orcamento-revisoes">
      <summary className="card-body py-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ cursor: 'pointer' }}>
        <span>
          <span className="fw-semibold">Revisões da oferta</span>
          <span className="text-muted small ms-2">
            {revisoes.length > 0
              ? `${revisoes.length} revisão(ões) criada(s)`
              : 'Histórico desta proposta'}
          </span>
        </span>
        <span className="btn btn-sm btn-outline-primary">Abrir revisões</span>
      </summary>
      <div className="card-body pt-0">
        {orcamento.orcamento_origem ? (
          <p className="small mb-3">
            Esta proposta foi criada a partir de{' '}
            <Link to={`/orcamentos/${orcamento.orcamento_origem}`}>revisão anterior</Link>.
          </p>
        ) : null}

        {orcamento.snapshot_envio ? (
          <div className="alert alert-light border py-2 small mb-3" role="status">
            Oferta congelada em{' '}
            {new Date(orcamento.snapshot_envio.gerado_em).toLocaleString('pt-BR')} com total{' '}
            {valorMonetarioTabela(parseDecimalPt(orcamento.snapshot_envio.total))}.
          </div>
        ) : null}

        {revisoes.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Revisão</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Oferta</th>
                  <th className="text-end">Ação</th>
                </tr>
              </thead>
              <tbody>
                {revisoes.map((rev) => (
                  <tr key={rev.id}>
                    <td className="fw-semibold">{rev.codigo}</td>
                    <td>{rotuloTipoRevisao(rev.tipo_revisao)}</td>
                    <td>{rotuloStatusOrcamento(rev.status)}</td>
                    <td className="small text-muted">
                      {rev.snapshot_envio
                        ? `Congelada em ${new Date(rev.snapshot_envio.gerado_em).toLocaleDateString('pt-BR')}`
                        : 'Em edição'}
                    </td>
                    <td className="text-end">
                      <Link className="btn btn-sm btn-outline-secondary" to={`/orcamentos/${rev.id}`}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted small mb-0">
            Nenhuma revisão posterior criada até o momento.
          </p>
        )}
      </div>
    </details>
  )
}

function OrcamentoDadosCard({
  descricao,
  orcamento,
  podeEditar,
  status,
  titulo,
  validoAte,
  onSalvarCabecalho,
  setDescricao,
  setStatus,
  setTitulo,
  setValidoAte,
}: Readonly<{
  descricao: string
  orcamento: OrcamentoDto
  podeEditar: boolean
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
            <p className="text-muted small mb-1">Cliente</p>
            <h2 className="h6 mb-0">{orcamento.cliente_nome || '—'}</h2>
            {orcamento.contato_cliente_nome ? (
              <p className="small text-muted mb-0 mt-1">
                {orcamento.contato_cliente_nome}
                {orcamento.contato_cliente_email
                  ? ` · ${orcamento.contato_cliente_email}`
                  : ''}
              </p>
            ) : null}
          </div>
          <span className="badge text-bg-secondary">{statusLabel}</span>
        </div>

        {orcamento.snapshot_envio ? (
          <div className="alert alert-secondary py-2 small" role="status">
            Oferta enviada congelada em{' '}
            {new Date(orcamento.snapshot_envio.gerado_em).toLocaleString('pt-BR')} com total{' '}
            {valorMonetarioTabela(parseDecimalPt(orcamento.snapshot_envio.total))}. Novas alterações
            devem ser feitas em uma revisão.
          </div>
        ) : null}

        <form id={ORCAMENTO_DADOS_FORM_ID} onSubmit={onSalvarCabecalho}>
          <div className="row g-3">
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
          </div>
        </form>
      </div>
    </div>
  )
}

function rotuloTipoRevisao(tipo: OrcamentoDto['tipo_revisao']): string {
  if (tipo === 'COMERCIAL') return 'Comercial'
  if (tipo === 'TECNICA') return 'Técnica'
  return 'Inicial'
}

function rotuloStatusOrcamento(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

function OrcamentoItensCard({
  adicionarLinha,
  adicionarLinhaCatalogo,
  margemProdutos,
  atualizarLinha,
  linhasComCustoZero,
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
  linhasComCustoZero: number[]
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
              O preço unitário é calculado automaticamente a partir do custo e dados fiscais.
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

        {linhasComCustoZero.length > 0 ? (
          <div className="alert alert-danger py-2 small" role="alert">
            Produto com custo zerado nas linhas {linhasComCustoZero.join(', ')}. Informe custo
            maior que zero antes de guardar.
          </div>
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
            <th style={{ width: '2.5rem' }}>#</th>
            <th style={{ width: '7rem' }}>Origem</th>
            <th style={{ width: '8rem' }}>Tipo</th>
            <th>Descrição</th>
            <th style={{ width: '6.5rem' }}>NCM</th>
            <th className="text-end" style={{ width: '7rem' }}>
              Qtd
            </th>
            <th className="text-end" style={{ width: '8rem' }}>
              Custo
            </th>
            <th className="text-end" style={{ width: '5rem' }} title="Referência do catálogo">
              IPI %
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
            <td colSpan={9} className="text-end fw-semibold">
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
  const custoZero = produtoComCustoZero(linha)
  return (
    <tr className={custoZero ? 'table-danger' : historico ? 'table-secondary' : undefined}>
      <td className="text-muted">{index + 1}</td>
      <td className="small text-muted">{rotuloOrigemLinhaOrcamento(linha.origem)}</td>
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
                produtoNcm: tipo === 'SERVICO' ? undefined : linha.produtoNcm,
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
      <td className="small text-muted" title="NCM do produto no catálogo fiscal">
        {exibirNcmLinhaOrcamento(linha.tipo, linha.produtoNcm)}
      </td>
      <OrcamentoCampoLinha campo="quantidade" index={index} linha={linha} podeEditar={linhaEditavel} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <OrcamentoCampoLinha campo="custo_unitario" index={index} linha={linha} podeEditar={linhaEditavel} salvandoItens={salvandoItens} atualizarLinha={atualizarLinha} />
      <td className="text-end text-muted small" title="Definido no catálogo fiscal">
        {formatIpiExibicao(linha.aliquota_ipi)}
      </td>
      <td className="text-end">
        {precoLinhaExibicao(linha)}
        {custoZero ? <div className="small text-danger">Custo obrigatório</div> : null}
      </td>
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
