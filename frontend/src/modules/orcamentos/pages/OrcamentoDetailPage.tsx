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
import OrcamentoServicoAutocomplete from '../components/OrcamentoServicoAutocomplete'
import {
  atualizarOfertaOrcamento,
  atualizarOrcamento,
  obterOrcamento,
  reabrirOfertaOrcamento,
  revisarPrecoCatalogoItemOrcamento,
} from '../services/orcamentosApi'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import type { OrcamentoDto, OrcamentoItemDto } from '../types/orcamentos'
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
  tituloPainelRef,
} from '../utils/orcamentoOrigemLinha'
import { criarLinhaDeServicoCatalogo } from '../utils/orcamentoCatalogoServicoLinha'
import type { ServicoListItem } from '@/modules/catalogo/types/servico'

import './OrcamentoDetailPage.css'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'FINALIZADO', label: 'Finalizado' },
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
        painelRef: item.painel_ref?.trim() || undefined,
        produtoId: item.produto ?? undefined,
        produtoIdOriginal: item.produto ?? undefined,
        produtoCodigo: item.produto_codigo ?? undefined,
        produtoNcm: item.produto_ncm ?? undefined,
        servicoId: item.servico ?? undefined,
        servicoIdOriginal: item.servico ?? undefined,
        servicoCodigo: item.servico_codigo ?? undefined,
        servicoUnidadeMedida: item.servico_unidade_medida ?? undefined,
        servicoCategoria: item.servico_categoria ?? undefined,
        catalogoPrecoAtualizadoEm: item.catalogo_preco_atualizado_em ?? null,
        catalogoPrecoDesatualizado: item.catalogo_preco_desatualizado === true,
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

function totalizarLinhas(linhas: LinhaEditavelOrcamento[]): number {
  let soma = 0
  for (const linha of linhas) {
    const q = parseDecimalPt(linha.quantidade)
    const p = parseDecimalPt(linha.preco_unitario)
    if (!Number.isFinite(q) || !Number.isFinite(p)) continue
    soma += q * p
  }
  return soma
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
  const podeRevisarPrecoCatalogo = hasPermission(user, PERMISSION_KEYS.CATALOGO_REVISAR_PRECO)

  const [orcamento, setOrcamento] = useState<OrcamentoDto | null>(null)
  const podeEditar = podeEditarPerm && (orcamento?.editavel !== false)
  const motivoBloqueioEdicao = !podeEditarPerm
    ? 'Seu utilizador não possui permissão para editar orçamentos.'
    : orcamento?.editavel === false
      ? 'Esta proposta não está em rascunho. Apenas propostas em rascunho podem ser alteradas.'
      : null
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [atualizandoOferta, setAtualizandoOferta] = useState(false)
  const [finalizandoOferta, setFinalizandoOferta] = useState(false)
  const [reabrindoOferta, setReabrindoOferta] = useState(false)
  const [revisandoPrecoItemId, setRevisandoPrecoItemId] = useState<string | null>(null)
  const [revisaoPrecoLinha, setRevisaoPrecoLinha] = useState<LinhaEditavelOrcamento | null>(null)
  const [revisaoPrecoValor, setRevisaoPrecoValor] = useState('')
  const [revisaoPrecoJustificativa, setRevisaoPrecoJustificativa] = useState('')
  const [revisaoPrecoManterAtual, setRevisaoPrecoManterAtual] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState('RASCUNHO')
  const [validoAte, setValidoAte] = useState('')
  const [margemProdutos, setMargemProdutos] = useState('0')
  const [margemServicos, setMargemServicos] = useState('0')
  const [margemProdutosMin, setMargemProdutosMin] = useState('0')
  const [margemServicosMin, setMargemServicosMin] = useState('0')
  const [linhasItens, setLinhasItens] = useState<LinhaEditavelOrcamento[]>([])

  const aplicarOrcamentoAtualizado = useCallback((dados: OrcamentoDto) => {
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
  }, [])

  const recarregar = useCallback(async () => {
    if (!id) return
    setCarregando(true)
    try {
      const dados = await obterOrcamento(id)
      aplicarOrcamentoAtualizado(dados)
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
  }, [aplicarOrcamentoAtualizado, id, showToast])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const linhasProdutos = useMemo(
    () => linhasItens.filter((linha) => linha.tipo !== 'SERVICO'),
    [linhasItens]
  )
  const linhasServicos = useMemo(
    () => linhasItens.filter((linha) => linha.tipo === 'SERVICO'),
    [linhasItens]
  )
  const totalProdutos = useMemo(() => totalizarLinhas(linhasProdutos), [linhasProdutos])
  const totalServicos = useMemo(() => totalizarLinhas(linhasServicos), [linhasServicos])
  const totalOrcamento = totalProdutos + totalServicos

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
            {
              key: 'status',
              text: rotuloStatusOrcamento(orcamento.status),
            },
            { key: 'itens', text: `${linhasItens.length} item(ns)` },
            ...(orcamento.snapshot_envio
              ? [{ key: 'snapshot', text: 'Oferta congelada', variant: 'light' as const }]
              : []),
          ]
        : undefined,
      primaryAction: podeEditar
        ? {
            label: 'Salvar proposta',
            formId: ORCAMENTO_DADOS_FORM_ID,
            loading: salvando,
            loadingLabel: 'Salvando…',
            disabled: linhasComCustoZero.length > 0,
          }
        : undefined,
    }),
    [linhasComCustoZero.length, linhasItens.length, orcamento, podeEditar, salvando]
  )

  useAppPageToolbar(toolbarConfig)

  const handleSalvarProposta: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void salvarPropostaAsync()
  }

  function montarPayloadItens(linhas: LinhaEditavelOrcamento[]) {
    const linhasValidas = linhas.filter((l) => l.descricao.trim())
    if (linhasValidas.length !== linhas.length) {
      showToast({
        variant: 'warning',
        message: 'Preencha a descrição de todas as linhas ou remova linhas vazias.',
      })
      return null
    }
    const linhasEditaveis = linhasValidas.filter((linha) => linha.editavel !== false)
    const linhasSemCusto = linhasProdutosComCustoZero(linhasEditaveis)
    if (linhasSemCusto.length > 0) {
      showToast({
        variant: 'danger',
        title: 'Custo obrigatório',
        message: `Informe custo maior que zero nas linhas de produto: ${linhasSemCusto.join(', ')}.`,
      })
      return null
    }
    return linhasEditaveis.map((linha, idx) => {
      const produtoAlterado = linha.produtoId !== linha.produtoIdOriginal
      const servicoAlterado = linha.servicoId !== linha.servicoIdOriginal
      return {
        ...(linha.id ? { id: linha.id } : {}),
        ordem: idx,
        tipo: linha.tipo,
        ...(linha.origem ? { origem: linha.origem as 'MANUAL' | 'CATALOGO' | 'CONFIGURADOR' } : {}),
        ...(!linha.id || produtoAlterado ? { produto: linha.produtoId ?? null } : {}),
        ...(!linha.id || servicoAlterado ? { servico: linha.servicoId ?? null } : {}),
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
      }
    })
  }

  async function salvarPropostaAsync() {
    if (!id || !podeEditar) return
    const itens = montarPayloadItens(linhasItens)
    if (itens === null) return

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
        itens,
      })
      aplicarOrcamentoAtualizado(atualizado)
      showToast({ variant: 'success', message: 'Proposta salva.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar a proposta.',
      })
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarOfertaAsync() {
    if (!id || !podeEditar) return
    const confirmou = window.confirm(
      'Atualizar a oferta com as margens do cliente e os valores atuais do catálogo? Alterações não salvas na tela serão substituídas pelos dados gravados.'
    )
    if (!confirmou) return

    setAtualizandoOferta(true)
    try {
      const resultado = await atualizarOfertaOrcamento(id)
      aplicarOrcamentoAtualizado(resultado.orcamento)
      showToast({
        variant: 'success',
        message: `${resultado.itens_atualizados} linha(s) atualizada(s) com os padrões atuais.`,
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível atualizar a oferta.',
      })
    } finally {
      setAtualizandoOferta(false)
    }
  }

  async function finalizarOfertaAsync() {
    if (!id || !podeEditar) return
    const confirmou = window.confirm(
      'Finalizar esta oferta? Ela ficará congelada para edição interna. Finalizar não significa que a oferta foi enviada ao cliente.'
    )
    if (!confirmou) return

    const itens = montarPayloadItens(linhasItens)
    if (itens === null) return

    setFinalizandoOferta(true)
    try {
      const atualizado = await atualizarOrcamento(id, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        status: 'FINALIZADO',
        valido_ate: validoAte.trim() ? validoAte.trim() : null,
        margem_produtos_percentual: clampMargemParaCima(
          margemProdutos.trim() || '0',
          margemProdutosMin
        ),
        margem_servicos_percentual: clampMargemParaCima(
          margemServicos.trim() || '0',
          margemServicosMin
        ),
        itens,
      })
      aplicarOrcamentoAtualizado(atualizado)
      showToast({
        variant: 'success',
        message: 'Oferta finalizada. Ela ainda não foi enviada ao cliente.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível finalizar a oferta.',
      })
    } finally {
      setFinalizandoOferta(false)
    }
  }

  async function reabrirOfertaAsync() {
    if (!id || !podeEditarPerm || orcamento?.status !== 'FINALIZADO') return
    const confirmou = window.confirm(
      'Reabrir esta oferta para edição? Ela voltará ao modo rascunho e poderá ser alterada integralmente.'
    )
    if (!confirmou) return

    setReabrindoOferta(true)
    try {
      const atualizado = await reabrirOfertaOrcamento(id)
      aplicarOrcamentoAtualizado(atualizado)
      showToast({
        variant: 'success',
        message: 'Oferta reaberta em modo rascunho.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível reabrir a oferta.',
      })
    } finally {
      setReabrindoOferta(false)
    }
  }

  function abrirRevisaoPrecoCatalogo(linha: LinhaEditavelOrcamento) {
    setRevisaoPrecoLinha(linha)
    setRevisaoPrecoValor(linha.custo_unitario)
    setRevisaoPrecoJustificativa('')
    setRevisaoPrecoManterAtual(false)
  }

  function fecharRevisaoPrecoCatalogo() {
    if (revisandoPrecoItemId) return
    setRevisaoPrecoLinha(null)
    setRevisaoPrecoValor('')
    setRevisaoPrecoJustificativa('')
    setRevisaoPrecoManterAtual(false)
  }

  async function revisarPrecoCatalogoAsync() {
    const linha = revisaoPrecoLinha
    if (!id || !linha.id || !podeRevisarPrecoCatalogo || !podeEditar) return
    const precoBase = decimalPayload(revisaoPrecoValor, '')
    if (!precoBase || parseDecimalPt(precoBase) < 0) {
      showToast({
        variant: 'warning',
        message: 'Informe um preço base válido.',
      })
      return
    }
    const justificativa = revisaoPrecoJustificativa.trim()
    if (!justificativa) {
      showToast({
        variant: 'warning',
        message: 'Informe a justificativa da revisão de preço.',
      })
      return
    }

    setRevisandoPrecoItemId(linha.id)
    try {
      const atualizado = await revisarPrecoCatalogoItemOrcamento(
        id,
        linha.id,
        precoBase,
        justificativa
      )
      aplicarOrcamentoAtualizado(atualizado)
      setRevisaoPrecoLinha(null)
      setRevisaoPrecoValor('')
      setRevisaoPrecoJustificativa('')
      setRevisaoPrecoManterAtual(false)
      showToast({
        variant: 'success',
        message: 'Preço do catálogo revisado e linha da oferta recalculada.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível revisar o preço do catálogo.',
      })
    } finally {
      setRevisandoPrecoItemId(null)
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

  function adicionarLinhaServicoManual() {
    setLinhasItens((rows) => [
      ...rows,
      {
        ordem: rows.length,
        tipo: 'SERVICO',
        origem: 'MANUAL',
        editavel: true,
        descricao: '',
        quantidade: '1',
        custo_unitario: '0',
        margem_percentual: margemServicos || '0',
        margem_minima: margemServicos || '0',
        aliquota_ipi: null,
        preco_unitario: '0',
      },
    ])
  }

  function adicionarLinhaCatalogo(linha: LinhaEditavelOrcamento) {
    setLinhasItens((rows) => [...rows, { ...linha, ordem: rows.length }])
  }

  function adicionarLinhaServicoCatalogo(servico: ServicoListItem) {
    setLinhasItens((rows) => [
      ...rows,
      {
        ...criarLinhaDeServicoCatalogo(servico, margemServicos),
        ordem: rows.length,
      },
    ])
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
    <div className="container-fluid py-3 orcamento-doc-page">
      <OrcamentoDetalheConteudo
        adicionarLinha={adicionarLinha}
        adicionarLinhaCatalogo={adicionarLinhaCatalogo}
        adicionarLinhaServicoCatalogo={adicionarLinhaServicoCatalogo}
        adicionarLinhaServicoManual={adicionarLinhaServicoManual}
        atualizarLinha={atualizarLinha}
        atualizandoOferta={atualizandoOferta}
        finalizandoOferta={finalizandoOferta}
        reabrindoOferta={reabrindoOferta}
        margemProdutos={margemProdutos}
        carregando={carregando}
        descricao={descricao}
        linhasComCustoZero={linhasComCustoZero}
        linhasItens={linhasItens}
        linhasProdutos={linhasProdutos}
        linhasServicos={linhasServicos}
        motivoBloqueioEdicao={motivoBloqueioEdicao}
        orcamento={orcamento}
        podeEditar={podeEditar}
        podeEditarPerm={podeEditarPerm}
        podeRevisarPrecoCatalogo={podeRevisarPrecoCatalogo}
        removerLinha={removerLinha}
        revisandoPrecoItemId={revisandoPrecoItemId}
        salvando={salvando}
        status={status}
        titulo={titulo}
        totalOrcamento={totalOrcamento}
        totalProdutos={totalProdutos}
        totalServicos={totalServicos}
        validoAte={validoAte}
        onAtualizarOferta={() => void atualizarOfertaAsync()}
        onFinalizarOferta={() => void finalizarOfertaAsync()}
        onReabrirOferta={() => void reabrirOfertaAsync()}
        onRevisarPrecoCatalogo={abrirRevisaoPrecoCatalogo}
        onSalvarProposta={handleSalvarProposta}
        onOrcamentoAtualizado={aplicarOrcamentoAtualizado}
        setDescricao={setDescricao}
        setStatus={setStatus}
        setTitulo={setTitulo}
        setValidoAte={setValidoAte}
      />
      <RevisarPrecoCatalogoModal
        linha={revisaoPrecoLinha}
        valor={revisaoPrecoValor}
        justificativa={revisaoPrecoJustificativa}
        manterAtual={revisaoPrecoManterAtual}
        salvando={Boolean(revisandoPrecoItemId)}
        onChangeValor={setRevisaoPrecoValor}
        onChangeJustificativa={setRevisaoPrecoJustificativa}
        onChangeManterAtual={setRevisaoPrecoManterAtual}
        onClose={fecharRevisaoPrecoCatalogo}
        onConfirm={() => void revisarPrecoCatalogoAsync()}
      />
    </div>
  )
}

type OrcamentoDetalheConteudoProps = {
  adicionarLinha: () => void
  adicionarLinhaCatalogo: (linha: LinhaEditavelOrcamento) => void
  adicionarLinhaServicoCatalogo: (servico: ServicoListItem) => void
  adicionarLinhaServicoManual: () => void
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  atualizandoOferta: boolean
  finalizandoOferta: boolean
  reabrindoOferta: boolean
  margemProdutos: string
  linhasComCustoZero: number[]
  carregando: boolean
  descricao: string
  linhasItens: LinhaEditavelOrcamento[]
  linhasProdutos: LinhaEditavelOrcamento[]
  linhasServicos: LinhaEditavelOrcamento[]
  motivoBloqueioEdicao: string | null
  orcamento: OrcamentoDto | null
  podeEditar: boolean
  podeEditarPerm: boolean
  podeRevisarPrecoCatalogo: boolean
  removerLinha: (index: number) => void
  revisandoPrecoItemId: string | null
  salvando: boolean
  status: string
  titulo: string
  totalOrcamento: number
  totalProdutos: number
  totalServicos: number
  validoAte: string
  onAtualizarOferta: () => void
  onFinalizarOferta: () => void
  onReabrirOferta: () => void
  onRevisarPrecoCatalogo: (linha: LinhaEditavelOrcamento) => void
  onSalvarProposta: FormEventHandler<HTMLFormElement>
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

function RevisarPrecoCatalogoModal({
  linha,
  valor,
  justificativa,
  manterAtual,
  salvando,
  onChangeValor,
  onChangeJustificativa,
  onChangeManterAtual,
  onClose,
  onConfirm,
}: Readonly<{
  linha: LinhaEditavelOrcamento | null
  valor: string
  justificativa: string
  manterAtual: boolean
  salvando: boolean
  onChangeValor: (valor: string) => void
  onChangeJustificativa: (valor: string) => void
  onChangeManterAtual: (valor: boolean) => void
  onClose: () => void
  onConfirm: () => void
}>) {
  if (!linha) return null

  const margem = parseDecimalPt(linha.margem_percentual)
  const quantidade = parseDecimalPt(linha.quantidade)
  const custoAtual = parseDecimalPt(linha.custo_unitario)
  const valorEfetivo = manterAtual ? linha.custo_unitario : valor
  const precoAtual = parseDecimalPt(linha.preco_unitario)
  const novoPrecoUnitario = parseDecimalPt(
    calcularPrecoUnitarioLinha(valorEfetivo || '0', linha.margem_percentual, linha.aliquota_ipi)
  )
  const novoCusto = parseDecimalPt(valorEfetivo || '0')
  const novoSubtotal =
    Number.isFinite(quantidade) && Number.isFinite(novoPrecoUnitario)
      ? quantidade * novoPrecoUnitario
      : 0
  const subtotalAtual =
    Number.isFinite(quantidade) && Number.isFinite(precoAtual)
      ? quantidade * precoAtual
      : 0
  const podeConfirmar = Number.isFinite(novoCusto) && novoCusto >= 0 && justificativa.trim().length > 0

  return (
    <>
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orc-revisar-preco-title"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="orc-revisar-preco-title" className="modal-title h5 mb-0">
                Revisar preço do catálogo
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Fechar"
                onClick={onClose}
                disabled={salvando}
              />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <div className="small text-muted">Item</div>
                <div className="fw-semibold">
                  {linha.produtoCodigo || linha.servicoCodigo || 'Sem código'} · {linha.descricao}
                </div>
                <div className="small text-muted">
                  Esta ação revisa o preço oficial do catálogo e recalcula esta linha da oferta.
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  id="orc-revisar-preco-manter"
                  className="form-check-input"
                  type="checkbox"
                  checked={manterAtual}
                  onChange={(e) => onChangeManterAtual(e.target.checked)}
                  disabled={salvando}
                />
                <label className="form-check-label" htmlFor="orc-revisar-preco-manter">
                  Manter preço atual e apenas renovar a revisão
                </label>
              </div>

              <div className="table-responsive mb-3">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th className="text-end">Atual</th>
                      <th className="text-end">Novo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Preço base catálogo</td>
                      <td className="text-end">R$ {valorMonetarioTabela(custoAtual)}</td>
                      <td className="text-end">
                        <input
                          className="form-control form-control-sm text-end"
                          value={valor}
                          onChange={(e) => onChangeValor(e.target.value)}
                          inputMode="decimal"
                          disabled={salvando || manterAtual}
                          aria-label="Novo preço base"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Margem da linha</td>
                      <td className="text-end">{Number.isFinite(margem) ? `${margem}%` : '-'}</td>
                      <td className="text-end">{Number.isFinite(margem) ? `${margem}%` : '-'}</td>
                    </tr>
                    <tr>
                      <td>{linha.tipo === 'SERVICO' ? 'IPI' : 'IPI do produto'}</td>
                      <td className="text-end">{formatIpiExibicao(linha.aliquota_ipi)}</td>
                      <td className="text-end">{formatIpiExibicao(linha.aliquota_ipi)}</td>
                    </tr>
                    <tr>
                      <td>Preço unitário calculado</td>
                      <td className="text-end">R$ {valorMonetarioTabela(precoAtual)}</td>
                      <td className="text-end">R$ {valorMonetarioTabela(novoPrecoUnitario)}</td>
                    </tr>
                    <tr>
                      <td>Subtotal da linha</td>
                      <td className="text-end">R$ {valorMonetarioTabela(subtotalAtual)}</td>
                      <td className="text-end fw-semibold">R$ {valorMonetarioTabela(novoSubtotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <label className="form-label" htmlFor="orc-revisar-preco-justificativa">
                Justificativa
              </label>
              <textarea
                id="orc-revisar-preco-justificativa"
                className="form-control"
                rows={3}
                value={justificativa}
                onChange={(e) => onChangeJustificativa(e.target.value)}
                disabled={salvando}
                maxLength={500}
                required
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={salvando}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={salvando || !podeConfirmar}
              >
                {salvando ? 'Revisando...' : manterAtual ? 'Renovar revisão' : 'Revisar preço'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" aria-hidden="true" />
    </>
  )
}

function OrcamentoEdicao({
  adicionarLinha,
  adicionarLinhaCatalogo,
  adicionarLinhaServicoCatalogo,
  adicionarLinhaServicoManual,
  atualizarLinha,
  atualizandoOferta,
  descricao,
  finalizandoOferta,
  linhasComCustoZero,
  linhasItens,
  linhasProdutos,
  linhasServicos,
  motivoBloqueioEdicao,
  margemProdutos,
  orcamento,
  podeEditar,
  podeEditarPerm,
  podeRevisarPrecoCatalogo,
  reabrindoOferta,
  removerLinha,
  revisandoPrecoItemId,
  salvando,
  status,
  titulo,
  totalOrcamento,
  totalProdutos,
  totalServicos,
  validoAte,
  onAtualizarOferta,
  onFinalizarOferta,
  onReabrirOferta,
  onRevisarPrecoCatalogo,
  onSalvarProposta,
  onOrcamentoAtualizado,
  setDescricao,
  setStatus,
  setTitulo,
  setValidoAte,
}: Readonly<Omit<OrcamentoDetalheConteudoProps, 'carregando' | 'orcamento'> & {
  orcamento: OrcamentoDto
}>) {
  return (
    <form id={ORCAMENTO_DADOS_FORM_ID} onSubmit={onSalvarProposta}>
      {motivoBloqueioEdicao ? (
        <div className="alert alert-warning mb-3 py-2" role="alert">
          {motivoBloqueioEdicao}
        </div>
      ) : null}

      <div className="orcamento-doc">
        <OrcamentoDocumentoCabecalho
          linhasItens={linhasItens.length}
          orcamento={orcamento}
          podeEditar={podeEditar}
          status={status}
          titulo={titulo}
          totalOrcamento={totalOrcamento}
          validoAte={validoAte}
          setStatus={setStatus}
          setTitulo={setTitulo}
          setValidoAte={setValidoAte}
        />

        {podeEditar || (podeEditarPerm && orcamento.status === 'FINALIZADO') ? (
          <div className="orcamento-doc__actions" aria-label="Ações da oferta">
            {podeEditar ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={onAtualizarOferta}
                  disabled={salvando || atualizandoOferta || finalizandoOferta}
                >
                  {atualizandoOferta ? 'Atualizando oferta...' : 'Atualizar oferta'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={onFinalizarOferta}
                  disabled={
                    salvando ||
                    atualizandoOferta ||
                    finalizandoOferta ||
                    linhasComCustoZero.length > 0
                  }
                >
                  {finalizandoOferta ? 'Finalizando...' : 'Finalizar oferta'}
                </button>
              </>
            ) : null}
            {podeEditarPerm && orcamento.status === 'FINALIZADO' ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={onReabrirOferta}
                disabled={reabrindoOferta}
              >
                {reabrindoOferta ? 'Reabrindo...' : 'Reabrir oferta'}
              </button>
            ) : null}
          </div>
        ) : null}

        <OrcamentoItensSecao
          adicionarLinha={adicionarLinha}
          adicionarLinhaCatalogo={adicionarLinhaCatalogo}
          adicionarLinhaServicoCatalogo={adicionarLinhaServicoCatalogo}
          adicionarLinhaServicoManual={adicionarLinhaServicoManual}
          margemProdutos={margemProdutos}
          atualizarLinha={atualizarLinha}
          linhasComCustoZero={linhasComCustoZero}
          linhasItens={linhasItens}
          linhasProdutos={linhasProdutos}
          linhasServicos={linhasServicos}
          orcamento={orcamento}
          podeEditar={podeEditar}
          podeRevisarPrecoCatalogo={podeRevisarPrecoCatalogo}
          removerLinha={removerLinha}
          revisandoPrecoItemId={revisandoPrecoItemId}
          salvando={salvando}
          onRevisarPrecoCatalogo={onRevisarPrecoCatalogo}
          totalOrcamento={totalOrcamento}
          totalProdutos={totalProdutos}
          totalServicos={totalServicos}
        />

        <div className="orcamento-doc__section orcamento-doc__section--secondary">
          <div className="orcamento-doc__subsection">
            <div className="orcamento-doc__subsection-head">Configurador de painéis</div>
            <div className="orcamento-doc__subsection-body orcamento-doc-paineis">
              <OrcamentoPainelsCard
                orcamento={orcamento}
                podeEditar={podeEditar}
                onAtualizado={onOrcamentoAtualizado}
                embedded
              />
            </div>
          </div>

          <OrcamentoRevisoesSecao orcamento={orcamento} />

          <div className="orcamento-doc__subsection">
            <div className="orcamento-doc__subsection-head">Observações e escopo</div>
            <div className="orcamento-doc__subsection-body">
              <OrcamentoDescricaoCampo
                descricao={descricao}
                podeEditar={podeEditar}
                setDescricao={setDescricao}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function OrcamentoRevisoesSecao({ orcamento }: Readonly<{ orcamento: OrcamentoDto }>) {
  const revisoes = orcamento.revisoes_derivadas ?? []
  const temHistorico = Boolean(
    orcamento.orcamento_origem || revisoes.length > 0 || orcamento.snapshot_envio
  )
  if (!temHistorico) return null

  return (
    <details className="orcamento-doc__subsection" id="orcamento-revisoes">
      <summary
        className="orcamento-doc__subsection-head d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{ cursor: 'pointer' }}
      >
        <span>
          Revisões da oferta
          <span className="text-muted fw-normal ms-2" style={{ textTransform: 'none', letterSpacing: 0 }}>
            {revisoes.length > 0
              ? `${revisoes.length} revisão(ões)`
              : 'Histórico'}
          </span>
        </span>
        <span className="btn btn-sm btn-outline-secondary py-0">Ver detalhes</span>
      </summary>
      <div className="orcamento-doc__subsection-body">
        {orcamento.orcamento_origem ? (
          <p className="small mb-2">
            Criada a partir de{' '}
            <Link to={`/orcamentos/${orcamento.orcamento_origem}`}>revisão anterior</Link>.
          </p>
        ) : null}

        {orcamento.snapshot_envio ? (
          <div className="alert alert-light border py-2 small mb-2" role="status">
            Oferta congelada em{' '}
            {new Date(orcamento.snapshot_envio.gerado_em).toLocaleString('pt-BR')} · total{' '}
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
                    <td className="fw-semibold font-monospace">{rev.codigo}</td>
                    <td>{rotuloTipoRevisao(rev.tipo_revisao)}</td>
                    <td>
                      <span className={classeBadgeStatusOrcamento(rev.status)}>
                        {rotuloStatusOrcamento(rev.status)}
                      </span>
                    </td>
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
          <p className="text-muted small mb-0">Nenhuma revisão posterior criada.</p>
        )}
      </div>
    </details>
  )
}

function classeBadgeStatusOrcamento(status: string): string {
  const base = 'orcamento-doc__status-badge'
  const map: Record<string, string> = {
    RASCUNHO: `${base} ${base}--rascunho`,
    FINALIZADO: `${base} ${base}--finalizado`,
    ENVIADO: `${base} ${base}--enviado`,
    APROVADO: `${base} ${base}--aprovado`,
    REJEITADO: `${base} ${base}--rejeitado`,
    CANCELADO: `${base} ${base}--cancelado`,
  }
  return map[status] ?? base
}

function formatarDataExibicao(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function margensClientePath(clienteId: string | null | undefined): string {
  if (!clienteId) return '/orcamentos/margens-clientes'
  return `/orcamentos/margens-clientes?cliente=${encodeURIComponent(clienteId)}`
}

function OrcamentoDocumentoCabecalho({
  linhasItens,
  orcamento,
  podeEditar,
  status,
  titulo,
  totalOrcamento,
  validoAte,
  setStatus,
  setTitulo,
  setValidoAte,
}: Readonly<{
  linhasItens: number
  orcamento: OrcamentoDto
  podeEditar: boolean
  status: string
  titulo: string
  totalOrcamento: number
  validoAte: string
  setStatus: Dispatch<SetStateAction<string>>
  setTitulo: Dispatch<SetStateAction<string>>
  setValidoAte: Dispatch<SetStateAction<string>>
}>) {
  const contatoResumo = [
    orcamento.contato_cliente_nome,
    orcamento.contato_cliente_email,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <header className="orcamento-doc__header">
      <div className="orcamento-doc__header-main">
        {orcamento.snapshot_envio ? (
          <div className="alert alert-secondary py-1 px-2 small mb-2" role="status">
            Oferta congelada em{' '}
            {new Date(orcamento.snapshot_envio.gerado_em).toLocaleString('pt-BR')}.{' '}
            {orcamento.status === 'FINALIZADO'
              ? 'Reabra a oferta para editar antes do envio ao cliente.'
              : 'Alterações apenas via revisão.'}
          </div>
        ) : null}

        <div className="orcamento-doc__header-top">
          <span className="orcamento-doc__doctype">Proposta comercial</span>
          <code className="orcamento-doc__codigo">{orcamento.codigo}</code>
          {orcamento.revisao?.trim() ? (
            <span className="badge text-bg-light border">Rev. {orcamento.revisao}</span>
          ) : null}
          <span className={classeBadgeStatusOrcamento(status)}>
            {rotuloStatusOrcamento(status)}
          </span>
        </div>

        <div className="orcamento-doc__meta-grid">
          <div className="orcamento-doc__field">
            <span className="orcamento-doc__field-label">Cliente</span>
            <div className="orcamento-doc__field-value">{orcamento.cliente_nome || '—'}</div>
            {contatoResumo ? (
              <div className="orcamento-doc__field-hint">{contatoResumo}</div>
            ) : null}
          </div>
          <div className="orcamento-doc__field">
            <label htmlFor="orc-det-valido">Validade da oferta</label>
            <input
              id="orc-det-valido"
              type="date"
              className="form-control form-control-sm"
              value={validoAte}
              onChange={(e) => setValidoAte(e.target.value)}
              disabled={!podeEditar}
              title="Padrão: 15 dias a partir da criação"
            />
          </div>
          <div className="orcamento-doc__field">
            <label htmlFor="orc-det-status">Estado</label>
            <select
              id="orc-det-status"
              className="form-select form-select-sm"
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
          <div className="orcamento-doc__field">
            <span className="orcamento-doc__field-label">Criada em</span>
            <div className="orcamento-doc__field-value">
              {formatarDataExibicao(orcamento.criado_em)}
            </div>
          </div>
          <div className="orcamento-doc__field">
            <span className="orcamento-doc__field-label">Margens aplicadas</span>
            <div className="orcamento-doc__field-value">
              Produtos {orcamento.margem_produtos_percentual ?? '0'}% · Serviços{' '}
              {orcamento.margem_servicos_percentual ?? '0'}%
            </div>
            {orcamento.cliente ? (
              <Link
                className="orcamento-doc__field-hint d-inline-block"
                to={margensClientePath(orcamento.cliente)}
              >
                Configurar margens do cliente
              </Link>
            ) : null}
          </div>
          <div className="orcamento-doc__field orcamento-doc__field--wide">
            <label htmlFor="orc-det-titulo">Título / referência</label>
            <input
              id="orc-det-titulo"
              className="form-control form-control-sm"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
              required
              disabled={!podeEditar}
              placeholder="Ex.: Painel QGBT — linha de envase"
            />
          </div>
        </div>
      </div>

      <aside className="orcamento-doc__resumo" aria-label="Resumo financeiro">
        <div className="orcamento-doc__resumo-label">Total da proposta</div>
        <div className="orcamento-doc__resumo-total">
          R$ {valorMonetarioTabela(totalOrcamento)}
        </div>
        <div className="orcamento-doc__resumo-meta">
          {linhasItens} linha(s) · validade {formatarDataExibicao(validoAte)}
        </div>
      </aside>
    </header>
  )
}

function OrcamentoDescricaoCampo({
  descricao,
  podeEditar,
  setDescricao,
}: Readonly<{
  descricao: string
  podeEditar: boolean
  setDescricao: Dispatch<SetStateAction<string>>
}>) {
  return (
    <>
      <label className="visually-hidden" htmlFor="orc-det-desc">
        Descrição / escopo da proposta
      </label>
      <textarea
        id="orc-det-desc"
        className="form-control form-control-sm"
        rows={3}
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        disabled={!podeEditar}
        placeholder="Condições comerciais, prazo de entrega, escopo resumido ou observações para o cliente…"
      />
    </>
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

function OrcamentoItensSecao({
  adicionarLinha,
  adicionarLinhaCatalogo,
  adicionarLinhaServicoCatalogo,
  adicionarLinhaServicoManual,
  margemProdutos,
  atualizarLinha,
  linhasComCustoZero,
  linhasItens,
  linhasProdutos,
  linhasServicos,
  orcamento,
  podeEditar,
  podeRevisarPrecoCatalogo,
  removerLinha,
  revisandoPrecoItemId,
  salvando,
  onRevisarPrecoCatalogo,
  totalOrcamento,
  totalProdutos,
  totalServicos,
}: Readonly<{
  adicionarLinha: () => void
  adicionarLinhaCatalogo: (linha: LinhaEditavelOrcamento) => void
  adicionarLinhaServicoCatalogo: (servico: ServicoListItem) => void
  adicionarLinhaServicoManual: () => void
  margemProdutos: string
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  linhasComCustoZero: number[]
  linhasItens: LinhaEditavelOrcamento[]
  linhasProdutos: LinhaEditavelOrcamento[]
  linhasServicos: LinhaEditavelOrcamento[]
  orcamento: OrcamentoDto
  podeEditar: boolean
  podeRevisarPrecoCatalogo: boolean
  removerLinha: (index: number) => void
  revisandoPrecoItemId: string | null
  salvando: boolean
  onRevisarPrecoCatalogo: (linha: LinhaEditavelOrcamento) => void
  totalOrcamento: number
  totalProdutos: number
  totalServicos: number
}>) {
  const [termoServico, setTermoServico] = useState('')

  return (
    <section className="orcamento-doc__section orcamento-doc__section--primary">
      <div className="orcamento-doc__section-head">
        <span>Linhas do orçamento</span>
        <span className="fw-normal text-muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
          {linhasItens.length} item(ns)
        </span>
      </div>
      <div className="orcamento-doc__section-body">
        {podeEditar ? (
          <div className="orcamento-doc__toolbar">
            <span className="orcamento-doc__toolbar-label">Incluir item:</span>
            <OrcamentoCatalogoItemForm
              margemProdutos={margemProdutos}
              onAdicionar={adicionarLinhaCatalogo}
              disabled={salvando}
              variant="inline"
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary ms-auto"
              onClick={adicionarLinha}
              disabled={salvando}
            >
              Linha manual
            </button>
          </div>
        ) : null}

        {linhasComCustoZero.length > 0 ? (
          <div className="alert alert-danger py-2 small mb-2" role="alert">
            Custo obrigatório nas linhas {linhasComCustoZero.join(', ')} antes de salvar.
          </div>
        ) : null}

        <OrcamentoItensTable
          atualizarLinha={atualizarLinha}
          linhasItens={linhasProdutos}
          linhasBase={linhasItens}
          titulo="Produtos"
          orcamento={orcamento}
          podeEditar={podeEditar}
          podeRevisarPrecoCatalogo={podeRevisarPrecoCatalogo}
          removerLinha={removerLinha}
          revisandoPrecoItemId={revisandoPrecoItemId}
          salvando={salvando}
          onRevisarPrecoCatalogo={onRevisarPrecoCatalogo}
          totalOrcamento={totalProdutos}
        />

        <div className="orcamento-doc__subsection mt-3">
          <div className="orcamento-doc__subsection-head d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>Serviços</span>
            <span className="fw-normal text-muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {linhasServicos.length} serviço(s)
            </span>
          </div>
          <div className="orcamento-doc__subsection-body">
            {podeEditar ? (
              <div className="orcamento-doc__toolbar">
                <span className="orcamento-doc__toolbar-label">Incluir serviço:</span>
                <div className="orcamento-doc__toolbar-search">
                  <OrcamentoServicoAutocomplete
                    value={termoServico}
                    onValueChange={setTermoServico}
                    onSelectServico={(servico) => {
                      adicionarLinhaServicoCatalogo(servico)
                      setTermoServico('')
                    }}
                    disabled={salvando}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary ms-auto"
                  onClick={adicionarLinhaServicoManual}
                  disabled={salvando}
                >
                  Serviço manual
                </button>
              </div>
            ) : null}

            <OrcamentoItensTable
              atualizarLinha={atualizarLinha}
              linhasItens={linhasServicos}
              linhasBase={linhasItens}
              titulo="Serviços"
              orcamento={orcamento}
              podeEditar={podeEditar}
              podeRevisarPrecoCatalogo={podeRevisarPrecoCatalogo}
              removerLinha={removerLinha}
              revisandoPrecoItemId={revisandoPrecoItemId}
              salvando={salvando}
              onRevisarPrecoCatalogo={onRevisarPrecoCatalogo}
              totalOrcamento={totalServicos}
            />
          </div>
        </div>

        <div className="orcamento-doc__totais-grid" aria-label="Resumo da oferta">
          <span>Subtotal produtos</span>
          <strong>R$ {valorMonetarioTabela(totalProdutos)}</strong>
          <span>Subtotal serviços</span>
          <strong>R$ {valorMonetarioTabela(totalServicos)}</strong>
          <span>Total da proposta</span>
          <strong>R$ {valorMonetarioTabela(totalOrcamento)}</strong>
        </div>
      </div>
    </section>
  )
}

function OrcamentoItensTable({
  atualizarLinha,
  linhasItens,
  linhasBase,
  titulo,
  orcamento,
  podeEditar,
  podeRevisarPrecoCatalogo,
  removerLinha,
  revisandoPrecoItemId,
  salvando,
  onRevisarPrecoCatalogo,
  totalOrcamento,
}: Readonly<{
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  linhasItens: LinhaEditavelOrcamento[]
  linhasBase: LinhaEditavelOrcamento[]
  titulo: string
  orcamento: OrcamentoDto
  podeEditar: boolean
  podeRevisarPrecoCatalogo: boolean
  removerLinha: (index: number) => void
  revisandoPrecoItemId: string | null
  salvando: boolean
  onRevisarPrecoCatalogo: (linha: LinhaEditavelOrcamento) => void
  totalOrcamento: number
}>) {
  const tabelaServicos = titulo === 'Serviços'
  if (linhasItens.length === 0) {
    return (
      <p className="orcamento-doc__empty-itens mb-0">
        Nenhuma linha em {titulo.toLowerCase()}. Use a busca do catálogo ou adicione uma linha manual.
      </p>
    )
  }

  return (
    <div className="table-responsive" style={{ overflow: 'visible' }}>
      <table className="table table-sm table-hover align-middle orcamento-doc-itens-table">
        <thead>
          <tr>
            <th style={{ width: '2.5rem' }}>#</th>
            <th style={{ width: '7rem' }}>Origem</th>
            {!tabelaServicos ? <th style={{ width: '3.5rem' }}>Painel</th> : null}
            <th style={{ width: '8rem' }}>Tipo</th>
            <th style={{ width: '7.5rem' }}>Código</th>
            <th>Descrição</th>
            <th style={{ width: '6.5rem' }}>{tabelaServicos ? 'Unid.' : 'NCM'}</th>
            <th className="text-end" style={{ width: '7rem' }}>
              Qtd
            </th>
            <th className="text-end" style={{ width: '8rem' }}>
              Custo
            </th>
            <th className="text-end" style={{ width: '5rem' }} title="Referência do catálogo">
              {tabelaServicos ? 'Categoria' : 'IPI %'}
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
            const indiceGlobal = linhasBase.indexOf(linha)
            return (
              <OrcamentoItemRow
                key={linha.id ?? `nova-${indiceGlobal}-${index}`}
                atualizarLinha={atualizarLinha}
                index={indiceGlobal >= 0 ? indiceGlobal : index}
                linha={linha}
                tabelaServicos={tabelaServicos}
                numeroLinha={indiceGlobal >= 0 ? indiceGlobal + 1 : index + 1}
                orcamento={orcamento}
                podeEditar={podeEditar}
                podeRevisarPrecoCatalogo={podeRevisarPrecoCatalogo}
                removerLinha={removerLinha}
                revisandoPreco={linha.id === revisandoPrecoItemId}
                salvando={salvando}
                onRevisarPrecoCatalogo={onRevisarPrecoCatalogo}
              />
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={tabelaServicos ? 10 : 11} className="text-end">
              Total {titulo.toLowerCase()}
            </td>
            <td className="text-end orcamento-doc__total-valor">
              R$ {valorMonetarioTabela(totalOrcamento)}
            </td>
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
  numeroLinha,
  tabelaServicos,
  orcamento,
  podeEditar,
  podeRevisarPrecoCatalogo,
  removerLinha,
  revisandoPreco,
  salvando,
  onRevisarPrecoCatalogo,
}: Readonly<{
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  index: number
  linha: LinhaEditavelOrcamento
  numeroLinha: number
  tabelaServicos: boolean
  orcamento: OrcamentoDto
  podeEditar: boolean
  podeRevisarPrecoCatalogo: boolean
  removerLinha: (index: number) => void
  revisandoPreco: boolean
  salvando: boolean
  onRevisarPrecoCatalogo: (linha: LinhaEditavelOrcamento) => void
}>) {
  const linhaEditavel = podeEditar && linha.editavel !== false
  const custoEditavel = linhaEditavel && linha.origem === 'MANUAL'
  const historico = linha.origem === 'HERANCA_REVISAO'
  const custoZero = produtoComCustoZero(linha)
  const precoCatalogoDesatualizado = linha.catalogoPrecoDesatualizado === true
  const rowClass = custoZero
    ? 'table-danger'
    : historico
      ? 'table-secondary'
      : precoCatalogoDesatualizado
        ? 'table-warning'
        : undefined
  return (
    <tr className={rowClass}>
      <td className="text-muted">{numeroLinha}</td>
      <td className="small text-muted">
        {rotuloOrigemLinhaOrcamento(linha.origem)}
        {precoCatalogoDesatualizado ? (
          <>
            <span
              className="d-block small fw-semibold text-warning-emphasis"
              title="Preço de catálogo sem revisão dentro do prazo configurado."
            >
              Preço vencido
            </span>
            {podeEditar && podeRevisarPrecoCatalogo && linha.id ? (
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-decoration-none"
                onClick={() => onRevisarPrecoCatalogo(linha)}
                disabled={salvando || revisandoPreco}
              >
                {revisandoPreco ? 'Revisando...' : 'Revisar preço'}
              </button>
            ) : null}
          </>
        ) : null}
      </td>
      {!tabelaServicos ? (
        <td
          className="small text-center fw-semibold text-primary"
          title={tituloPainelRef(linha.painelRef) || undefined}
        >
          {linha.painelRef?.trim() || '—'}
        </td>
      ) : null}
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
                produtoId: tipo === 'SERVICO' ? undefined : linha.produtoId,
                produtoCodigo: tipo === 'SERVICO' ? undefined : linha.produtoCodigo,
                servicoId: tipo === 'PRODUTO' ? undefined : linha.servicoId,
                servicoCodigo: tipo === 'PRODUTO' ? undefined : linha.servicoCodigo,
              })
            }}
            disabled={salvando}
          >
            <option value="PRODUTO">Produto</option>
            <option value="SERVICO">Serviço</option>
          </select>
        ) : (
          linha.tipo
        )}
      </td>
      <td className="small text-muted font-monospace" title="Código no catálogo">
        {linha.tipo === 'SERVICO'
          ? linha.servicoCodigo?.trim() || '—'
          : linha.produtoCodigo?.trim() || '—'}
      </td>
      {linhaEditavel && linha.tipo === 'PRODUTO' ? (
        <OrcamentoLinhaDescricaoCampo
          index={index}
          linha={linha}
          margemProdutos={orcamento.margem_produtos_percentual}
          salvandoItens={salvando}
          atualizarLinha={atualizarLinha}
        />
      ) : (
        <OrcamentoCampoLinha
          alinhadoDireita={false}
          campo="descricao"
          index={index}
          linha={linha}
          podeEditar={linhaEditavel}
          salvando={salvando}
          atualizarLinha={atualizarLinha}
          maxLength={500}
          placeholder="Descrição do item"
        />
      )}
      <td className="small text-muted" title={linha.tipo === 'SERVICO' ? 'Unidade do serviço' : 'NCM do produto no catálogo fiscal'}>
        {linha.tipo === 'SERVICO'
          ? linha.servicoUnidadeMedida?.trim() || '—'
          : exibirNcmLinhaOrcamento(linha.tipo, linha.produtoNcm)}
      </td>
      <OrcamentoCampoLinha campo="quantidade" index={index} linha={linha} podeEditar={linhaEditavel} salvando={salvando} atualizarLinha={atualizarLinha} />
      <OrcamentoCampoLinha
        campo="custo_unitario"
        index={index}
        linha={linha}
        podeEditar={custoEditavel}
        salvando={salvando}
        atualizarLinha={atualizarLinha}
        title={
          custoEditavel
            ? undefined
            : 'Custo definido pela origem da linha. Use Atualizar oferta para buscar os valores atuais do catálogo.'
        }
      />
      <td className="text-end text-muted small" title={linha.tipo === 'SERVICO' ? 'Categoria do serviço' : 'Definido no catálogo fiscal'}>
        {linha.tipo === 'SERVICO'
          ? linha.servicoCategoria?.trim() || '—'
          : formatIpiExibicao(linha.aliquota_ipi)}
      </td>
      <td className="text-end font-monospace">{precoLinhaExibicao(linha)}</td>
      <td className="text-end font-monospace fw-semibold">{subtotalLinha(linha)}</td>
      {linhaEditavel ? (
        <td className="text-end">
          <button
            type="button"
            className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
            onClick={() => removerLinha(index)}
            disabled={salvando}
            aria-label="Remover linha"
            title="Remover linha"
          >
            ×
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
  salvando,
  atualizarLinha,
  tituloMargemMinima,
  title,
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
  salvando: boolean
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  tituloMargemMinima?: string
  title?: string
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
          disabled={salvando}
          inputMode={alinhadoDireita ? 'decimal' : undefined}
          title={campo === 'margem_percentual' ? tituloMargemMinima : title}
        />
      </td>
    )
  }

  return (
    <td>
      <span className={alinhadoDireita ? 'd-block text-end' : ''} title={title}>
        {linha[campo]}
      </span>
    </td>
  )
}

function precoLinhaExibicao(linha: LinhaEditavelOrcamento): string {
  const preco = parseDecimalPt(linha.preco_unitario)
  if (!Number.isFinite(preco)) return '—'
  return `R$ ${valorMonetarioTabela(preco)}`
}

function subtotalLinha(linha: LinhaEditavelOrcamento): string {
  const quantidade = parseDecimalPt(linha.quantidade)
  const preco = parseDecimalPt(linha.preco_unitario)
  if (!Number.isFinite(quantidade) || !Number.isFinite(preco)) return '—'
  return `R$ ${valorMonetarioTabela(quantidade * preco)}`
}

function valorMonetarioTabela(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
