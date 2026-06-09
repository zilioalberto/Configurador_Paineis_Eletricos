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
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import OrcamentoCatalogoItemForm from '../components/OrcamentoCatalogoItemForm'
import OrcamentoLinhaDescricaoCampo from '../components/OrcamentoLinhaDescricaoCampo'
import OrcamentoOfertaDocumentoEditor from '../components/OrcamentoOfertaDocumentoEditor'
import OrcamentoResumoComercial from '../components/OrcamentoResumoComercial'
import OrcamentoPainelsCard from '../components/OrcamentoPainelsCard'
import OrcamentoEnviarOfertaModal from '../components/OrcamentoEnviarOfertaModal'
import OrcamentoRevisoesPainel from '../components/OrcamentoRevisoesPainel'
import OrcamentoServicoAutocomplete from '../components/OrcamentoServicoAutocomplete'
import {
  atualizarOfertaOrcamento,
  atualizarOrcamento,
  baixarArquivoOfertaOrcamento,
  baixarDocxOfertaOrcamento,
  gerarBlocosPadraoOfertaOrcamento,
  marcarOfertaEnviadaOrcamento,
  obterOrcamento,
  reabrirOfertaOrcamento,
  revisarPrecoCatalogoItemOrcamento,
  uploadArquivoOfertaOrcamento,
} from '../services/orcamentosApi'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import type {
  OrcamentoDto,
  OrcamentoOfertaArquivoDto,
  OrcamentoItemDto,
  OrcamentoOfertaBlocoDto,
  OrcamentoPreviewTotaisDto,
  PerfilOferta,
} from '../types/orcamentos'
import {
  blocosOfertaParaPersistencia,
  normalizarBlocosOfertaTemplate,
} from '../utils/ofertaBlocoUi'
import {
  clampMargemParaCima,
  parseDecimalPt,
  toDateInputValue,
  validadePadraoProposta,
  valorMonetarioTabela,
} from '../utils/orcamentoUi'
import { calcularPrecoUnitarioLinha } from '../utils/orcamentoPrecoLinha'
import { calcularResumoFinanceiroOferta } from '../utils/totaisOferta'
import { normalizarNcmInvestimento } from '../utils/ncmInvestimento'
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

/** Remove zeros e ponto final sem regex (evita ReDoS em strings formatadas). */
function removerZerosDecimaisFinais(valor: string): string {
  const ponto = valor.indexOf('.')
  if (ponto === -1) return valor

  let fim = valor.length
  while (fim > ponto + 1 && valor.charAt(fim - 1) === '0') {
    fim -= 1
  }
  if (fim > ponto && valor.charAt(fim - 1) === '.') {
    fim -= 1
  }
  return valor.slice(0, fim)
}

function decimalPayload(valor: string, fallback: string, casasDecimais = 4): string {
  const n = parseDecimalPt(valor.trim() || fallback)
  if (!Number.isFinite(n)) return fallback
  return removerZerosDecimaisFinais(n.toFixed(casasDecimais))
}

function blocosOfertaPayload(blocos: OrcamentoOfertaBlocoDto[], perfil: PerfilOferta) {
  return blocosOfertaParaPersistencia(blocos, perfil).map((bloco) => ({
    ...(bloco.id ? { id: bloco.id } : {}),
    ordem: bloco.ordem,
    tipo: bloco.tipo,
    titulo: bloco.titulo.trim(),
    conteudo: bloco.conteudo ?? '',
  }))
}

/** Formulário completo de edição de orçamento existente. */
export default function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuth()
  const podeEditarPerm = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_EDITAR)
  const podeAplicarDescontoComercial = hasPermission(
    user,
    PERMISSION_KEYS.ORCAMENTO_APLICAR_DESCONTO
  )
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
  const [baixandoDocxOferta, setBaixandoDocxOferta] = useState(false)
  const [uploadingArquivoOferta, setUploadingArquivoOferta] = useState<string | null>(null)
  const [baixandoArquivoOfertaId, setBaixandoArquivoOfertaId] = useState<string | null>(null)
  const [marcandoOfertaEnviada, setMarcandoOfertaEnviada] = useState(false)
  const [modalEnviarOferta, setModalEnviarOferta] = useState(false)
  const [ultimoLinkPublico, setUltimoLinkPublico] = useState('')
  const [gerandoBlocosPadrao, setGerandoBlocosPadrao] = useState(false)
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
  const [perfilOferta, setPerfilOferta] = useState<PerfilOferta>('MATERIAIS')
  const [descontoComercialAtivo, setDescontoComercialAtivo] = useState(false)
  const [descontoPercentual, setDescontoPercentual] = useState('0')
  const [ncmInvestimento, setNcmInvestimento] = useState('')
  const [investimentoDescricao, setInvestimentoDescricao] = useState('')
  const [ofertaBlocos, setOfertaBlocos] = useState<OrcamentoOfertaBlocoDto[]>([])
  const [ofertaFonteVersao, setOfertaFonteVersao] = useState(0)
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
    const perfil = dados.perfil_oferta ?? 'MATERIAIS'
    setPerfilOferta(perfil)
    setDescontoComercialAtivo(dados.desconto_comercial_ativo === true)
    setDescontoPercentual(String(dados.desconto_percentual ?? '0'))
    setNcmInvestimento(normalizarNcmInvestimento(dados.ncm_investimento))
    setInvestimentoDescricao((dados.investimento_descricao ?? '').trim())
    setOfertaBlocos(
      normalizarBlocosOfertaTemplate(
        [...(dados.oferta_blocos ?? [])].sort((a, b) => a.ordem - b.ordem),
        perfil
      )
    )
    setOfertaFonteVersao((v) => v + 1)
    setLinhasItens(itensParaLinhas(dados.itens ?? []))
  }, [])

  const ofertaBlocosDirty = useMemo(() => {
    if (!orcamento) return false
    const original = [...(orcamento.oferta_blocos ?? [])]
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
    const current = [...ofertaBlocos].slice().sort((a, b) => a.ordem - b.ordem)
    if (original.length !== current.length) return true
    for (let i = 0; i < original.length; i++) {
      const o = original[i]
      const c = current[i]
      if (!c) return true
      if ((o.tipo || '') !== (c.tipo || '')) return true
      if ((o.titulo || '').trim() !== (c.titulo || '').trim()) return true
      if ((o.conteudo || '').trim() !== (c.conteudo || '').trim()) return true
    }
    return false
  }, [ofertaBlocos, orcamento])

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
    recarregar().catch(() => undefined)
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

  const resumoOferta = useMemo(
    () =>
      calcularResumoFinanceiroOferta({
        linhas: linhasItens,
        descontoComercialAtivo,
        descontoPercentual,
      }),
    [descontoComercialAtivo, descontoPercentual, linhasItens]
  )

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
    }),
    [linhasItens.length, orcamento]
  )

  useAppPageToolbar(toolbarConfig)

  const handleSalvarProposta: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    salvarPropostaAsync().catch(() => undefined)
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
        perfil_oferta: perfilOferta,
        margem_produtos_percentual: clampMargemParaCima(
          margemProdutos.trim() || '0',
          margemProdutosMin
        ),
        margem_servicos_percentual: clampMargemParaCima(
          margemServicos.trim() || '0',
          margemServicosMin
        ),
        ...(perfilOferta === 'SOLUCAO_COMPLETA'
          ? {
              ncm_investimento: normalizarNcmInvestimento(ncmInvestimento),
              investimento_descricao: investimentoDescricao.trim(),
            }
          : {}),
        ...(podeAplicarDescontoComercial
          ? {
              desconto_comercial_ativo: descontoComercialAtivo,
              desconto_percentual: descontoPercentual.trim() || '0',
            }
          : {}),
        itens,
        oferta_blocos: blocosOfertaPayload(ofertaBlocos, perfilOferta),
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
    const confirmou = globalThis.confirm(
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
    const confirmou = globalThis.confirm(
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
        perfil_oferta: perfilOferta,
        margem_produtos_percentual: clampMargemParaCima(
          margemProdutos.trim() || '0',
          margemProdutosMin
        ),
        margem_servicos_percentual: clampMargemParaCima(
          margemServicos.trim() || '0',
          margemServicosMin
        ),
        ...(perfilOferta === 'SOLUCAO_COMPLETA'
          ? {
              ncm_investimento: normalizarNcmInvestimento(ncmInvestimento),
              investimento_descricao: investimentoDescricao.trim(),
            }
          : {}),
        ...(podeAplicarDescontoComercial
          ? {
              desconto_comercial_ativo: descontoComercialAtivo,
              desconto_percentual: descontoPercentual.trim() || '0',
            }
          : {}),
        itens,
        oferta_blocos: blocosOfertaPayload(ofertaBlocos, perfilOferta),
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
    const confirmou = globalThis.confirm(
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

  function abrirPropostaCliente() {
    if (!id) return
    navigate(`/orcamentos/${id}/oferta`)
  }

  async function baixarDocxOfertaAsync() {
    if (!id || !orcamento) return
    setBaixandoDocxOferta(true)
    try {
      const blob = await baixarDocxOfertaOrcamento(id)
      const url = globalThis.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${orcamento.codigo || 'proposta'}_oferta.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      globalThis.URL.revokeObjectURL(url)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível gerar o DOCX da oferta.',
      })
    } finally {
      setBaixandoDocxOferta(false)
    }
  }

  async function uploadArquivoOfertaAsync(tipo: 'DOCX_REVISADO' | 'PDF_FINAL', arquivo: File | null) {
    if (!id || !arquivo) return
    setUploadingArquivoOferta(tipo)
    try {
      const atualizado = await uploadArquivoOfertaOrcamento(id, tipo, arquivo)
      aplicarOrcamentoAtualizado(atualizado)
      showToast({
        variant: 'success',
        message: tipo === 'DOCX_REVISADO' ? 'DOCX revisado anexado.' : 'PDF final anexado.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível anexar o arquivo.',
      })
    } finally {
      setUploadingArquivoOferta(null)
    }
  }

  async function baixarArquivoOfertaAsync(arquivo: OrcamentoOfertaArquivoDto) {
    if (!id) return
    setBaixandoArquivoOfertaId(arquivo.id)
    try {
      const blob = await baixarArquivoOfertaOrcamento(id, arquivo.id)
      const url = globalThis.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = arquivo.nome_original
      document.body.appendChild(a)
      a.click()
      a.remove()
      globalThis.URL.revokeObjectURL(url)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível baixar o arquivo.',
      })
    } finally {
      setBaixandoArquivoOfertaId(null)
    }
  }

  async function marcarOfertaEnviadaAsync() {
    if (!id || !orcamento) return
    const pdfFinal = [...(orcamento.oferta_arquivos ?? [])].find((arquivo) => arquivo.tipo === 'PDF_FINAL')
    if (!pdfFinal) {
      showToast({
        variant: 'warning',
        message: 'Anexe o PDF final antes de marcar a oferta como enviada.',
      })
      return
    }
    const confirmou = globalThis.confirm(
      'Marcar esta oferta como enviada ao cliente? O sistema registrará o PDF final mais recente no histórico.'
    )
    if (!confirmou) return

    setMarcandoOfertaEnviada(true)
    try {
      const atualizado = await marcarOfertaEnviadaOrcamento(id, {
        pdf_final_id: pdfFinal.id,
        destinatario_nome: orcamento.contato_cliente_nome,
        destinatario_email: orcamento.contato_cliente_email,
        assunto: `Proposta comercial ZFW ${orcamento.codigo}`,
      })
      aplicarOrcamentoAtualizado(atualizado)
      showToast({ variant: 'success', message: 'Oferta marcada como enviada.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível marcar a oferta como enviada.',
      })
    } finally {
      setMarcandoOfertaEnviada(false)
    }
  }

  async function gerarBlocosPadraoAsync() {
    if (!id || !podeEditar) return
    const temTextoOferta = ofertaBlocos.some((b) => (b.conteudo || '').trim())
    const confirmou =
      !temTextoOferta ||
      globalThis.confirm('Substituir os textos atuais da oferta pelos textos padrão gerados pelo ERP?')
    if (!confirmou) return

    setGerandoBlocosPadrao(true)
    try {
      const atualizado = await gerarBlocosPadraoOfertaOrcamento(id, perfilOferta)
      aplicarOrcamentoAtualizado(atualizado)
      showToast({ variant: 'success', message: 'Blocos padrão gerados para a oferta.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível gerar os blocos padrão.',
      })
    } finally {
      setGerandoBlocosPadrao(false)
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
    if (!id || !linha || !linha.id || !podeRevisarPrecoCatalogo || !podeEditar) return
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
        gerandoBlocosPadrao={gerandoBlocosPadrao}
        carregando={carregando}
        descricao={descricao}
        linhasComCustoZero={linhasComCustoZero}
        linhasItens={linhasItens}
        linhasProdutos={linhasProdutos}
        linhasServicos={linhasServicos}
        motivoBloqueioEdicao={motivoBloqueioEdicao}
        ofertaBlocos={ofertaBlocos}
        orcamento={orcamento}
        perfilOferta={perfilOferta}
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
        resumoOferta={resumoOferta}
        descontoComercialAtivo={descontoComercialAtivo}
        descontoPercentual={descontoPercentual}
        podeAplicarDescontoComercial={podeAplicarDescontoComercial}
        setDescontoComercialAtivo={setDescontoComercialAtivo}
        setDescontoPercentual={setDescontoPercentual}
        ncmInvestimento={ncmInvestimento}
        setNcmInvestimento={setNcmInvestimento}
        investimentoDescricao={investimentoDescricao}
        setInvestimentoDescricao={setInvestimentoDescricao}
        validoAte={validoAte}
        onAtualizarOferta={() => {
          atualizarOfertaAsync().catch(() => undefined)
        }}
        onFinalizarOferta={() => {
          finalizarOfertaAsync().catch(() => undefined)
        }}
        onReabrirOferta={() => {
          reabrirOfertaAsync().catch(() => undefined)
        }}
        onPropostaCliente={abrirPropostaCliente}
        onBaixarDocxOferta={() => {
          baixarDocxOfertaAsync().catch(() => undefined)
        }}
        onUploadArquivoOferta={(tipo, arquivo) => {
          uploadArquivoOfertaAsync(tipo, arquivo).catch(() => undefined)
        }}
        onBaixarArquivoOferta={(arquivo) => {
          baixarArquivoOfertaAsync(arquivo).catch(() => undefined)
        }}
        onMarcarOfertaEnviada={() => {
          marcarOfertaEnviadaAsync().catch(() => undefined)
        }}
        onAbrirEnviarOferta={() => setModalEnviarOferta(true)}
        ultimoLinkPublico={ultimoLinkPublico}
        onGerarBlocosPadrao={() => {
          gerarBlocosPadraoAsync().catch(() => undefined)
        }}
        onRevisarPrecoCatalogo={abrirRevisaoPrecoCatalogo}
        onSalvarProposta={handleSalvarProposta}
        onOrcamentoAtualizado={aplicarOrcamentoAtualizado}
        ofertaBlocosDirty={ofertaBlocosDirty}
        baixandoDocxOferta={baixandoDocxOferta}
        uploadingArquivoOferta={uploadingArquivoOferta}
        baixandoArquivoOfertaId={baixandoArquivoOfertaId}
        marcandoOfertaEnviada={marcandoOfertaEnviada}
        setDescricao={setDescricao}
        setOfertaBlocos={setOfertaBlocos}
        ofertaFonteVersao={ofertaFonteVersao}
        onOfertaFonteVersaoBump={() => setOfertaFonteVersao((v) => v + 1)}
        setPerfilOferta={setPerfilOferta}
        setStatus={setStatus}
        setTitulo={setTitulo}
        setValidoAte={setValidoAte}
      />
      {modalEnviarOferta && orcamento ? (
        <OrcamentoEnviarOfertaModal
          orcamento={orcamento}
          finalizando={finalizandoOferta}
          onSolicitarFinalizar={() => {
            finalizarOfertaAsync().catch(() => undefined)
          }}
          onClose={() => setModalEnviarOferta(false)}
          onEnviado={(atualizado, link) => {
            aplicarOrcamentoAtualizado(atualizado)
            setUltimoLinkPublico(link)
          }}
        />
      ) : null}

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
        onConfirm={() => {
          revisarPrecoCatalogoAsync().catch(() => undefined)
        }}
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
  gerandoBlocosPadrao: boolean
  margemProdutos: string
  linhasComCustoZero: number[]
  carregando: boolean
  descricao: string
  linhasItens: LinhaEditavelOrcamento[]
  linhasProdutos: LinhaEditavelOrcamento[]
  linhasServicos: LinhaEditavelOrcamento[]
  motivoBloqueioEdicao: string | null
  ofertaBlocos: OrcamentoOfertaBlocoDto[]
  orcamento: OrcamentoDto | null
  perfilOferta: PerfilOferta
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
  resumoOferta: OrcamentoPreviewTotaisDto
  descontoComercialAtivo: boolean
  descontoPercentual: string
  podeAplicarDescontoComercial: boolean
  setDescontoComercialAtivo: Dispatch<SetStateAction<boolean>>
  setDescontoPercentual: Dispatch<SetStateAction<string>>
  ncmInvestimento: string
  setNcmInvestimento: Dispatch<SetStateAction<string>>
  investimentoDescricao: string
  setInvestimentoDescricao: Dispatch<SetStateAction<string>>
  validoAte: string
  ofertaBlocosDirty: boolean
  onAtualizarOferta: () => void
  onFinalizarOferta: () => void
  onGerarBlocosPadrao: () => void
  onBaixarDocxOferta: () => void
  onPropostaCliente: () => void
  onUploadArquivoOferta: (tipo: 'DOCX_REVISADO' | 'PDF_FINAL', arquivo: File | null) => void
  onBaixarArquivoOferta: (arquivo: OrcamentoOfertaArquivoDto) => void
  onMarcarOfertaEnviada: () => void
  onAbrirEnviarOferta: () => void
  ultimoLinkPublico: string
  onReabrirOferta: () => void
  onRevisarPrecoCatalogo: (linha: LinhaEditavelOrcamento) => void
  onSalvarProposta: FormEventHandler<HTMLFormElement>
  onOrcamentoAtualizado: (orcamento: OrcamentoDto) => void
  baixandoDocxOferta: boolean
  uploadingArquivoOferta: string | null
  baixandoArquivoOfertaId: string | null
  marcandoOfertaEnviada: boolean
  setDescricao: Dispatch<SetStateAction<string>>
  setOfertaBlocos: Dispatch<SetStateAction<OrcamentoOfertaBlocoDto[]>>
  ofertaFonteVersao: number
  onOfertaFonteVersaoBump: () => void
  setPerfilOferta: Dispatch<SetStateAction<PerfilOferta>>
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
  gerandoBlocosPadrao,
  linhasComCustoZero,
  linhasItens,
  linhasProdutos,
  linhasServicos,
  motivoBloqueioEdicao,
  margemProdutos,
  ofertaBlocos,
  orcamento,
  perfilOferta,
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
  onGerarBlocosPadrao,
  onBaixarDocxOferta,
  onPropostaCliente,
  onUploadArquivoOferta,
  onBaixarArquivoOferta,
  onMarcarOfertaEnviada,
  onAbrirEnviarOferta,
  ultimoLinkPublico,
  onReabrirOferta,
  onRevisarPrecoCatalogo,
  onSalvarProposta,
  onOrcamentoAtualizado,
  baixandoDocxOferta,
  uploadingArquivoOferta,
  baixandoArquivoOfertaId,
  marcandoOfertaEnviada,
  setDescricao,
  setOfertaBlocos,
  ofertaFonteVersao,
  onOfertaFonteVersaoBump,
  setPerfilOferta,
  setStatus,
  setTitulo,
  setValidoAte,
  ofertaBlocosDirty,
  resumoOferta,
  descontoComercialAtivo,
  descontoPercentual,
  podeAplicarDescontoComercial,
  setDescontoComercialAtivo,
  setDescontoPercentual,
  ncmInvestimento,
  setNcmInvestimento,
  investimentoDescricao,
  setInvestimentoDescricao,
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
          podeEditarPerm={podeEditarPerm}
          status={status}
          totalOrcamento={totalOrcamento}
          validoAte={validoAte}
          reabrindoOferta={reabrindoOferta}
          setStatus={setStatus}
          setValidoAte={setValidoAte}
          onReabrirOferta={onReabrirOferta}
        />

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
          podeEditarPerm={podeEditarPerm}
          podeRevisarPrecoCatalogo={podeRevisarPrecoCatalogo}
          removerLinha={removerLinha}
          revisandoPrecoItemId={revisandoPrecoItemId}
          salvando={salvando}
          atualizandoOferta={atualizandoOferta}
          finalizandoOferta={finalizandoOferta}
          onAtualizarOferta={onAtualizarOferta}
          onFinalizarOferta={onFinalizarOferta}
          onRevisarPrecoCatalogo={onRevisarPrecoCatalogo}
          resumoOferta={resumoOferta}
          descontoComercialAtivo={descontoComercialAtivo}
          descontoPercentual={descontoPercentual}
          podeAplicarDescontoComercial={podeAplicarDescontoComercial}
          setDescontoComercialAtivo={setDescontoComercialAtivo}
          setDescontoPercentual={setDescontoPercentual}
          totalProdutos={totalProdutos}
          totalServicos={totalServicos}
          ofertaBlocosDirty={ofertaBlocosDirty}
        />

        <OrcamentoOfertaClienteSecao
          blocos={ofertaBlocos}
          linhasItens={linhasItens}
          configuradoresPainel={orcamento.configuradores_painel ?? []}
          descontoComercialAtivo={descontoComercialAtivo}
          descontoPercentual={descontoPercentual}
          ncmInvestimento={ncmInvestimento}
          setNcmInvestimento={setNcmInvestimento}
          investimentoDescricao={investimentoDescricao}
          setInvestimentoDescricao={setInvestimentoDescricao}
          codigo={orcamento.codigo}
          codigoBase={orcamento.codigo_base}
          revisao={orcamento.revisao}
          titulo={titulo}
          setTitulo={setTitulo}
          tituloProposta={titulo}
          validade={validoAte.trim() ? validoAte.trim() : null}
          clienteNome={orcamento.cliente_nome || orcamento.cliente_referencia || ''}
          clienteContato={orcamento.contato_cliente_nome || ''}
          clienteEmail={orcamento.contato_cliente_email || ''}
          clienteTelefone={orcamento.contato_cliente_telefone || ''}
          clienteEndereco={orcamento.cliente_endereco || ''}
          clienteCnpj={orcamento.cliente_cnpj || ''}
          arquivos={orcamento.oferta_arquivos ?? []}
          envios={orcamento.oferta_envios ?? []}
          status={orcamento.status}
          perfil={perfilOferta}
          podeEditar={podeEditar}
          podeGerenciarFinal={podeEditarPerm}
          setBlocos={setOfertaBlocos}
          setPerfil={setPerfilOferta}
          fonteBlocosVersao={ofertaFonteVersao}
          onPerfilAlterado={onOfertaFonteVersaoBump}
          baixandoDocx={baixandoDocxOferta}
          gerandoBlocosPadrao={gerandoBlocosPadrao}
          onGerarBlocosPadrao={onGerarBlocosPadrao}
          onBaixarDocx={onBaixarDocxOferta}
          onPropostaCliente={onPropostaCliente}
          onUploadArquivo={onUploadArquivoOferta}
          onBaixarArquivo={onBaixarArquivoOferta}
          onMarcarEnviada={onMarcarOfertaEnviada}
          onEnviarOferta={onAbrirEnviarOferta}
          ultimoLinkPublico={ultimoLinkPublico}
          uploadingArquivo={uploadingArquivoOferta}
          baixandoArquivoId={baixandoArquivoOfertaId}
          marcandoEnviada={marcandoOfertaEnviada}
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

function OrcamentoOfertaClienteSecao({
  arquivos,
  blocos,
  linhasItens: linhasItensOferta,
  configuradoresPainel,
  descontoComercialAtivo,
  descontoPercentual,
  ncmInvestimento,
  setNcmInvestimento,
  investimentoDescricao,
  setInvestimentoDescricao,
  codigo,
  codigoBase,
  revisao,
  titulo,
  setTitulo,
  tituloProposta,
  validade,
  clienteNome,
  clienteContato,
  clienteEmail,
  clienteTelefone,
  clienteEndereco,
  clienteCnpj,
  envios,
  baixandoDocx,
  baixandoArquivoId,
  gerandoBlocosPadrao,
  marcandoEnviada,
  onBaixarDocx,
  onBaixarArquivo,
  onGerarBlocosPadrao,
  onMarcarEnviada,
  onEnviarOferta,
  ultimoLinkPublico,
  onPropostaCliente,
  onUploadArquivo,
  perfil,
  podeEditar,
  podeGerenciarFinal,
  setBlocos,
  setPerfil,
  fonteBlocosVersao,
  onPerfilAlterado,
  status,
  uploadingArquivo,
}: Readonly<{
  arquivos: OrcamentoOfertaArquivoDto[]
  blocos: OrcamentoOfertaBlocoDto[]
  linhasItens: LinhaEditavelOrcamento[]
  configuradoresPainel: NonNullable<OrcamentoDto['configuradores_painel']>
  descontoComercialAtivo: boolean
  descontoPercentual: string
  ncmInvestimento: string
  setNcmInvestimento: Dispatch<SetStateAction<string>>
  investimentoDescricao: string
  setInvestimentoDescricao: Dispatch<SetStateAction<string>>
  codigo: string
  codigoBase?: string
  revisao: string
  titulo: string
  setTitulo: Dispatch<SetStateAction<string>>
  tituloProposta: string
  validade: string | null
  clienteNome: string
  clienteContato: string
  clienteEmail: string
  clienteTelefone: string
  clienteEndereco: string
  clienteCnpj: string
  envios: NonNullable<OrcamentoDto['oferta_envios']>
  baixandoDocx: boolean
  baixandoArquivoId: string | null
  gerandoBlocosPadrao: boolean
  marcandoEnviada: boolean
  onBaixarDocx: () => void
  onBaixarArquivo: (arquivo: OrcamentoOfertaArquivoDto) => void
  onGerarBlocosPadrao: () => void
  onMarcarEnviada: () => void
  onEnviarOferta: () => void
  ultimoLinkPublico: string
  onPropostaCliente: () => void
  onUploadArquivo: (tipo: 'DOCX_REVISADO' | 'PDF_FINAL', arquivo: File | null) => void
  perfil: PerfilOferta
  podeEditar: boolean
  podeGerenciarFinal: boolean
  setBlocos: Dispatch<SetStateAction<OrcamentoOfertaBlocoDto[]>>
  setPerfil: Dispatch<SetStateAction<PerfilOferta>>
  fonteBlocosVersao: number
  onPerfilAlterado: () => void
  status: string
  uploadingArquivo: string | null
}>) {
  const arquivosOrdenados = [...arquivos].sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  )
  const pdfFinal = arquivosOrdenados.find((arquivo) => arquivo.tipo === 'PDF_FINAL')
  const ofertaEnviada = status === 'ENVIADO' || envios.length > 0

  return (
    <section className="orcamento-doc__section orcamento-doc__section--primary">
      <div className="orcamento-doc__section-head">
        <span>Oferta ao cliente</span>
        <span className="fw-normal text-muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
          {rotuloPerfilOferta(perfil)}
        </span>
      </div>
      <div className="orcamento-doc__section-body">
        <div className="orcamento-doc-oferta__top">
          <div className="orcamento-doc__field">
            <label htmlFor="orc-perfil-oferta">Perfil da oferta</label>
            <select
              id="orc-perfil-oferta"
              className="form-select form-select-sm"
              value={perfil}
              onChange={(e) => {
                const novoPerfil = e.target.value as PerfilOferta
                setPerfil(novoPerfil)
                if (novoPerfil === 'SOLUCAO_COMPLETA') {
                  setNcmInvestimento((atual) => normalizarNcmInvestimento(atual))
                }
                setBlocos((atuais) => normalizarBlocosOfertaTemplate(atuais, novoPerfil))
                onPerfilAlterado()
              }}
              disabled={!podeEditar}
            >
              <option value="MATERIAIS">Materiais com valores unitários</option>
              <option value="SOLUCAO_COMPLETA">Solução completa com escopo descritivo</option>
            </select>
          </div>
          {podeEditar ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={onGerarBlocosPadrao}
              disabled={gerandoBlocosPadrao}
            >
              {gerandoBlocosPadrao ? 'Gerando...' : 'Gerar textos padrão'}
            </button>
          ) : null}
          <button type="button" className="btn btn-sm btn-primary" onClick={onPropostaCliente}>
            Proposta para o cliente
          </button>
          {podeGerenciarFinal ? (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={onEnviarOferta}
              disabled={ofertaEnviada && status === 'APROVADO'}
            >
              {ofertaEnviada ? 'Reenviar ao cliente' : 'Enviar ao cliente'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onBaixarDocx}
            disabled={baixandoDocx}
          >
            {baixandoDocx ? 'Gerando DOCX...' : 'Exportar DOCX (revisão)'}
          </button>
        </div>

        <OrcamentoOfertaEnviosHistorico envios={envios} ultimoLinkPublico={ultimoLinkPublico} />

        <p className="orcamento-doc-oferta__hint text-muted small mb-2">
          Arraste ⠿ nas seções para alterar a ordem na prévia/PDF. Edite textos na coluna da esquerda
          ou na prévia (campos destacados). NCM e descrição do investimento ficam na seção
          Investimento. Use{' '}
          <strong>Texto avançado</strong> só para colar markdown. Salve a proposta antes de enviar.
        </p>

        <OrcamentoOfertaDocumentoEditor
          blocos={blocos}
          setBlocos={setBlocos}
          perfil={perfil}
          podeEditar={podeEditar}
          linhasItens={linhasItensOferta}
          configuradoresPainel={configuradoresPainel}
          descontoComercialAtivo={descontoComercialAtivo}
          descontoPercentual={descontoPercentual}
          ncmInvestimento={ncmInvestimento}
          setNcmInvestimento={setNcmInvestimento}
          investimentoDescricao={investimentoDescricao}
          setInvestimentoDescricao={setInvestimentoDescricao}
          titulo={titulo}
          setTitulo={setTitulo}
          fonteBlocosVersao={fonteBlocosVersao}
          contexto={{
            codigo,
            codigoBase,
            revisao,
            titulo: tituloProposta,
            validade,
            clienteNome,
            clienteContato,
            clienteEmail,
            clienteTelefone,
            clienteEndereco,
            clienteCnpj,
          }}
        />

        <OrcamentoOfertaAnexosFinal
          arquivosOrdenados={arquivosOrdenados}
          baixandoArquivoId={baixandoArquivoId}
          envios={envios}
          marcandoEnviada={marcandoEnviada}
          ofertaEnviada={ofertaEnviada}
          pdfFinal={pdfFinal}
          podeGerenciarFinal={podeGerenciarFinal}
          uploadingArquivo={uploadingArquivo}
          onBaixarArquivo={onBaixarArquivo}
          onMarcarEnviada={onMarcarEnviada}
          onUploadArquivo={onUploadArquivo}
        />
      </div>
    </section>
  )
}

function OrcamentoOfertaEnviosHistorico({
  envios,
  ultimoLinkPublico,
}: Readonly<{
  envios: NonNullable<OrcamentoDto['oferta_envios']>
  ultimoLinkPublico: string
}>) {
  return (
    <>
      {envios.length > 0 ? (
        <div className="orcamento-doc-envios small mb-2">
          <strong>Histórico de envios</strong>
          <ul className="list-unstyled mb-0 mt-1">
            {envios.map((envio) => (
              <li key={envio.id} className="mb-1">
                {new Date(envio.enviado_em).toLocaleString('pt-BR')} —{' '}
                {envio.destinatario_emails || envio.destinatario_email || envio.destinatario_nome || '—'}
                {envio.link_publico ? (
                  <>
                    {' '}
                    <a href={envio.link_publico} target="_blank" rel="noreferrer">
                      Link do cliente
                    </a>
                  </>
                ) : null}
                {envio.email_enviado ? ' · e-mail enviado' : null}
                {envio.email_erro ? (
                  <span className="text-warning"> · e-mail: {envio.email_erro}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ultimoLinkPublico ? (
        <div className="alert alert-info py-2 small mb-2">
          Link público copiado:{' '}
          <a href={ultimoLinkPublico} target="_blank" rel="noreferrer">
            {ultimoLinkPublico}
          </a>
        </div>
      ) : null}
    </>
  )
}

function OrcamentoOfertaAnexosFinal({
  arquivosOrdenados,
  baixandoArquivoId,
  envios,
  marcandoEnviada,
  ofertaEnviada,
  pdfFinal,
  podeGerenciarFinal,
  uploadingArquivo,
  onBaixarArquivo,
  onMarcarEnviada,
  onUploadArquivo,
}: Readonly<{
  arquivosOrdenados: OrcamentoOfertaArquivoDto[]
  baixandoArquivoId: string | null
  envios: NonNullable<OrcamentoDto['oferta_envios']>
  marcandoEnviada: boolean
  ofertaEnviada: boolean
  pdfFinal: OrcamentoOfertaArquivoDto | undefined
  podeGerenciarFinal: boolean
  uploadingArquivo: string | null
  onBaixarArquivo: (arquivo: OrcamentoOfertaArquivoDto) => void
  onMarcarEnviada: () => void
  onUploadArquivo: (tipo: 'DOCX_REVISADO' | 'PDF_FINAL', arquivo: File | null) => void
}>) {
  return (
    <details className="orcamento-doc-oferta-final orcamento-doc-oferta-final--opcional">
      <summary className="orcamento-doc-oferta-final__summary">
        <strong>Anexos e registro de envio</strong>
        <span className="text-muted small ms-2">
          Opcional — use só se revisar fora do portal ou arquivar PDF assinado
        </span>
      </summary>
      <div className="orcamento-doc-oferta-final__body">
        <div className="orcamento-doc-oferta-final__head">
          <div>
            <strong>Versão final da oferta</strong>
            <p className="text-muted small mb-0">
              Anexe o DOCX revisado e o PDF final que será registrado no histórico.
            </p>
          </div>
          {podeGerenciarFinal ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={onMarcarEnviada}
              disabled={!pdfFinal || marcandoEnviada || ofertaEnviada}
            >
              {marcandoEnviada ? 'Registrando...' : ofertaEnviada ? 'Oferta enviada' : 'Marcar como enviada'}
            </button>
          ) : null}
        </div>

        {podeGerenciarFinal ? (
          <div className="orcamento-doc-oferta-final__uploads">
            <label className="btn btn-sm btn-outline-primary mb-0">
              {uploadingArquivo === 'DOCX_REVISADO' ? 'Anexando DOCX...' : 'Anexar DOCX revisado'}
              <input
                type="file"
                accept=".docx"
                className="visually-hidden"
                disabled={Boolean(uploadingArquivo)}
                onChange={(event) => {
                  onUploadArquivo('DOCX_REVISADO', event.currentTarget.files?.[0] ?? null)
                  event.currentTarget.value = ''
                }}
              />
            </label>
            <label className="btn btn-sm btn-outline-primary mb-0">
              {uploadingArquivo === 'PDF_FINAL' ? 'Anexando PDF...' : 'Anexar PDF final'}
              <input
                type="file"
                accept=".pdf"
                className="visually-hidden"
                disabled={Boolean(uploadingArquivo)}
                onChange={(event) => {
                  onUploadArquivo('PDF_FINAL', event.currentTarget.files?.[0] ?? null)
                  event.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        ) : null}

        {arquivosOrdenados.length === 0 ? (
          <p className="orcamento-doc__empty-itens mb-0">
            Nenhum DOCX revisado ou PDF final anexado.
          </p>
        ) : (
          <div className="orcamento-doc-oferta-final__files">
            {arquivosOrdenados.map((arquivo) => (
              <div className="orcamento-doc-oferta-final__file" key={arquivo.id}>
                <div>
                  <span className="badge text-bg-light me-2">
                    {arquivo.tipo === 'PDF_FINAL' ? 'PDF final' : 'DOCX revisado'} v{arquivo.versao}
                  </span>
                  <strong>{arquivo.nome_original}</strong>
                  <div className="text-muted small">
                    {formatarDataHoraExibicao(arquivo.criado_em)}
                    {arquivo.criado_por_label ? ` · ${arquivo.criado_por_label}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onBaixarArquivo(arquivo)}
                  disabled={baixandoArquivoId === arquivo.id}
                >
                  {baixandoArquivoId === arquivo.id ? 'Baixando...' : 'Baixar'}
                </button>
              </div>
            ))}
          </div>
        )}

        {envios.length > 0 ? (
          <div className="orcamento-doc-oferta-final__sent">
            Último envio registrado em {formatarDataHoraExibicao(envios[0].enviado_em)}
            {envios[0].destinatario_email ? ` para ${envios[0].destinatario_email}` : ''}.
          </div>
        ) : null}
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

function formatarDataHoraExibicao(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function margensClientePath(clienteId: string | null | undefined): string {
  if (!clienteId) return '/orcamentos/margens-clientes'
  return `/orcamentos/margens-clientes?cliente=${encodeURIComponent(clienteId)}`
}

function OrcamentoDocumentoCabecalho({
  linhasItens,
  orcamento,
  podeEditar,
  podeEditarPerm,
  status,
  totalOrcamento,
  validoAte,
  reabrindoOferta,
  setStatus,
  setValidoAte,
  onReabrirOferta,
}: Readonly<{
  linhasItens: number
  orcamento: OrcamentoDto
  podeEditar: boolean
  podeEditarPerm: boolean
  status: string
  totalOrcamento: number
  validoAte: string
  reabrindoOferta: boolean
  setStatus: Dispatch<SetStateAction<string>>
  setValidoAte: Dispatch<SetStateAction<string>>
  onReabrirOferta: () => void
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
          <div className="orcamento-doc__field orcamento-doc__field--revisoes">
            <OrcamentoRevisoesPainel
              orcamento={orcamento}
              podeEditarPerm={podeEditarPerm}
              reabrindoOferta={reabrindoOferta}
              onReabrirOferta={onReabrirOferta}
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

function rotuloStatusOrcamento(status: string): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

function rotuloPerfilOferta(perfil: PerfilOferta): string {
  if (perfil === 'SOLUCAO_COMPLETA') return 'Solução completa'
  return 'Materiais'
}

function OrcamentoItensSecao({
  adicionarLinha,
  adicionarLinhaCatalogo,
  adicionarLinhaServicoCatalogo,
  adicionarLinhaServicoManual,
  margemProdutos,
  atualizarLinha,
  atualizandoOferta,
  finalizandoOferta,
  linhasComCustoZero,
  linhasItens,
  linhasProdutos,
  linhasServicos,
  orcamento,
  podeEditar,
  podeEditarPerm,
  podeRevisarPrecoCatalogo,
  removerLinha,
  revisandoPrecoItemId,
  salvando,
  onAtualizarOferta,
  onFinalizarOferta,
  onRevisarPrecoCatalogo,
  ofertaBlocosDirty,
  resumoOferta,
  descontoComercialAtivo,
  descontoPercentual,
  podeAplicarDescontoComercial,
  setDescontoComercialAtivo,
  setDescontoPercentual,
  totalProdutos,
  totalServicos,
}: Readonly<{
  adicionarLinha: () => void
  adicionarLinhaCatalogo: (linha: LinhaEditavelOrcamento) => void
  adicionarLinhaServicoCatalogo: (servico: ServicoListItem) => void
  adicionarLinhaServicoManual: () => void
  margemProdutos: string
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
  atualizandoOferta: boolean
  finalizandoOferta: boolean
  linhasComCustoZero: number[]
  linhasItens: LinhaEditavelOrcamento[]
  linhasProdutos: LinhaEditavelOrcamento[]
  linhasServicos: LinhaEditavelOrcamento[]
  orcamento: OrcamentoDto
  podeEditar: boolean
  podeEditarPerm: boolean
  podeRevisarPrecoCatalogo: boolean
  removerLinha: (index: number) => void
  revisandoPrecoItemId: string | null
  salvando: boolean
  onAtualizarOferta: () => void
  onFinalizarOferta: () => void
  onRevisarPrecoCatalogo: (linha: LinhaEditavelOrcamento) => void
  resumoOferta: OrcamentoPreviewTotaisDto
  descontoComercialAtivo: boolean
  descontoPercentual: string
  podeAplicarDescontoComercial: boolean
  setDescontoComercialAtivo: Dispatch<SetStateAction<boolean>>
  setDescontoPercentual: Dispatch<SetStateAction<string>>
  totalProdutos: number
  totalServicos: number
  ofertaBlocosDirty: boolean
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

        <OrcamentoResumoComercial
          podeEditar={podeEditar}
          podeConfigurarDesconto={podeAplicarDescontoComercial}
          descontoAtivo={descontoComercialAtivo}
          descontoPercentual={descontoPercentual}
          totais={resumoOferta}
          onDescontoAtivoChange={setDescontoComercialAtivo}
          onDescontoPercentualChange={setDescontoPercentual}
        />

        {podeEditar || (podeEditarPerm && orcamento.status === 'FINALIZADO') ? (
          <div className="orcamento-doc__actions mt-3" aria-label="Ações da oferta">
            {podeEditar ? (
              <>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={salvando || linhasComCustoZero.length > 0}
                >
                  {salvando ? 'Salvando...' : 'Salvar proposta'}
                </button>
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
                {ofertaBlocosDirty ? (
                  <span className="badge bg-warning text-dark ms-2" title="Há alterações de oferta não salvas">
                    Alterações locais
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
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
    <div className="table-responsive orcamento-doc-itens-table-wrap">
      <table className="table table-sm table-hover align-middle orcamento-doc-itens-table">
        <thead>
          <tr>
            <th style={{ width: '2.5rem' }}>#</th>
            <th className="orc-col-compact-hide" style={{ width: '7rem' }}>
              Origem
            </th>
            {!tabelaServicos ? (
              <th className="orc-col-compact-hide" style={{ width: '3.5rem' }}>
                Painel
              </th>
            ) : null}
            <th className="orc-col-compact-hide" style={{ width: '8rem' }}>
              Tipo
            </th>
            <th style={{ width: '7.5rem' }}>Código</th>
            <th>Descrição</th>
            <th className="orc-col-compact-hide" style={{ width: '6.5rem' }}>
              {tabelaServicos ? 'Unid.' : 'NCM'}
            </th>
            <th className="text-end" style={{ width: '7rem' }}>
              Qtd
            </th>
            <th className="text-end orc-col-compact-hide" style={{ width: '8rem' }}>
              Custo
            </th>
            <th
              className="text-end orc-col-compact-hide"
              style={{ width: '5rem' }}
              title="Referência do catálogo"
            >
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
          <tr className="orc-tfoot-desktop">
            <td colSpan={tabelaServicos ? 10 : 11} className="text-end">
              Total {titulo.toLowerCase()}
            </td>
            <td className="text-end orcamento-doc__total-valor">
              R$ {valorMonetarioTabela(totalOrcamento)}
            </td>
            {podeEditar ? <td /> : null}
          </tr>
          <tr className="orc-tfoot-compact">
            <td colSpan={tabelaServicos ? 4 : 5} className="text-end">
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
      <td className="small text-muted orc-col-compact-hide">
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
      {tabelaServicos ? null : (
        <td
          className="small text-center fw-semibold text-primary orc-col-compact-hide"
          title={tituloPainelRef(linha.painelRef) || undefined}
        >
          {linha.painelRef?.trim() || '—'}
        </td>
      )}
      <td className="orc-col-compact-hide">
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
      <td className="small text-muted orc-col-compact-hide" title={linha.tipo === 'SERVICO' ? 'Unidade do serviço' : 'NCM do produto no catálogo fiscal'}>
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
        cellClassName="orc-col-compact-hide"
        title={
          custoEditavel
            ? undefined
            : 'Custo definido pela origem da linha. Use Atualizar oferta para buscar os valores atuais do catálogo.'
        }
      />
      <td className="text-end text-muted small orc-col-compact-hide" title={linha.tipo === 'SERVICO' ? 'Categoria do serviço' : 'Definido no catálogo fiscal'}>
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
  cellClassName,
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
  cellClassName?: string
}>) {
  if (podeEditar) {
    return (
      <td className={cellClassName}>
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
    <td className={cellClassName}>
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
