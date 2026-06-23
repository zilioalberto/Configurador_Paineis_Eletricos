import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { ApiError } from '@/services/http/ApiError'
import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { montarNomeArquivoProjeto } from '../utils/composicaoDisplay'
import { useAprovarSugestaoMutation } from './useAprovarSugestaoMutation'
import { useGerarSugestoesMutation } from './useGerarSugestoesMutation'
import { useReabrirComposicaoItemMutation } from './useReabrirComposicaoItemMutation'
import { useReavaliarPendenciasMutation } from './useReavaliarPendenciasMutation'
import {
  exportarComposicaoListaPdf,
  exportarComposicaoListaXlsx,
} from '../services/composicaoService'
import type { ComposicaoItem, ComposicaoSnapshot, SugestaoItem } from '../types/composicao'

const COMPOSICAO_AUTO_GERAR_DEDUP_MS = 800
let composicaoAutoGerarDedup: { projetoId: string; key: string; at: number } | null = null

type ToastFn = (input: {
  variant: 'success' | 'danger' | 'warning'
  title?: string
  message: string
}) => void

type Params = {
  projetoId: string
  podeEditar: boolean
  projetoSelecionado: Projeto | undefined
  snapshot: ComposicaoSnapshot | undefined
  loadingSnap: boolean
  isError: boolean
  showToast: ToastFn
  setAlterarSugestao: (v: SugestaoItem | null) => void
  setConfirmExportFmt: (v: 'pdf' | 'xlsx' | null) => void
  setExportando: (v: 'pdf' | 'xlsx' | null) => void
  setAprovandoTodas: (v: boolean) => void
  setItemReabrir: (v: ComposicaoItem | null) => void
  itemReabrir: ComposicaoItem | null
  autoGerarKey?: string
  filtrarSugestaoAprovar?: (sugestao: SugestaoItem) => boolean
}

/** Ações da página de composição (gerar, aprovar, exportar, reabrir). */
export function useComposicaoPageActions({
  projetoId,
  podeEditar,
  projetoSelecionado,
  snapshot,
  loadingSnap,
  isError,
  showToast,
  setAlterarSugestao,
  setConfirmExportFmt,
  setExportando,
  setAprovandoTodas,
  setItemReabrir,
  itemReabrir,
  autoGerarKey = 'default',
  filtrarSugestaoAprovar,
}: Params) {
  const queryClient = useQueryClient()
  const gerarMutation = useGerarSugestoesMutation(projetoId || null)
  const gerarMutateAsyncRef = useRef(gerarMutation.mutateAsync)
  gerarMutateAsyncRef.current = gerarMutation.mutateAsync
  const [autoGerando, setAutoGerando] = useState(false)
  const reavaliarPendenciasMutation = useReavaliarPendenciasMutation(projetoId || null)
  const aprovarMutation = useAprovarSugestaoMutation(projetoId || null)
  const reabrirComposicaoItemMutation = useReabrirComposicaoItemMutation(projetoId || null)

  // Conflito (HTTP 409): a composição mudou no servidor desde o carregamento da
  // página. Recarrega o snapshot e usa um toast de aviso (não é falha grave).
  const tratarErroAprovacao = useCallback(
    (err: unknown, tituloFallback: string) => {
      console.error(err)
      const ehConflito = ApiError.isApiError(err) && err.status === 409
      if (ehConflito && projetoId) {
        void queryClient.invalidateQueries({
          queryKey: composicaoQueryKeys.snapshot(projetoId),
        })
      }
      showToast({
        variant: ehConflito ? 'warning' : 'danger',
        title: ehConflito ? 'Composição desatualizada' : tituloFallback,
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
      return ehConflito
    },
    [projetoId, queryClient, showToast]
  )

  const notificarResultadoGeracao = useCallback(
    (data: ComposicaoSnapshot) => {
      const erros = data.geracao?.erros_etapas ?? []
      const descartadas = data.geracao?.sugestoes_descartadas_aprovadas ?? 0
      if (erros.length > 0) {
        showToast({
          variant: 'warning',
          title: 'Sugestões geradas com avisos',
          message: erros.map((e) => `${e.etapa}: ${e.erro}`).join(' · '),
        })
      } else {
        showToast({
          variant: 'success',
          message:
            descartadas > 0
              ? `Sugestões atualizadas. ${descartadas} item(ns) já aprovado(s) não foram reabertos.`
              : 'Sugestões de composição atualizadas.',
        })
      }
    },
    [showToast]
  )

  const onGerar = useCallback(async () => {
    if (!projetoId || !podeEditar) return
    try {
      const data = await gerarMutation.mutateAsync(true)
      notificarResultadoGeracao(data)
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível gerar sugestões',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [projetoId, podeEditar, gerarMutation, notificarResultadoGeracao, showToast])

  const jaDisparouAutoGerarRef = useRef(false)
  useEffect(() => {
    jaDisparouAutoGerarRef.current = false
    setAutoGerando(false)
  }, [projetoId, autoGerarKey])

  const snapshotCarregado = !loadingSnap && !isError && snapshot != null

  useEffect(() => {
    if (!projetoId || !podeEditar || !snapshotCarregado) return
    if (jaDisparouAutoGerarRef.current) return

    const now = Date.now()
    if (
      composicaoAutoGerarDedup?.projetoId === projetoId &&
      composicaoAutoGerarDedup?.key === autoGerarKey &&
      now - composicaoAutoGerarDedup.at < COMPOSICAO_AUTO_GERAR_DEDUP_MS
    ) {
      jaDisparouAutoGerarRef.current = true
      return
    }
    composicaoAutoGerarDedup = { projetoId, key: autoGerarKey, at: now }
    jaDisparouAutoGerarRef.current = true

    let cancelled = false
    setAutoGerando(true)
    const autoGerar = async () => {
      try {
        const data = await gerarMutateAsyncRef.current(true)
        if (cancelled) return
        notificarResultadoGeracao(data)
      } catch (err) {
        if (cancelled) return
        console.error(err)
        showToast({
          variant: 'danger',
          title: 'Não foi possível gerar sugestões',
          message: extrairMensagemErroApi(err) || 'Tente novamente.',
        })
      } finally {
        if (!cancelled) setAutoGerando(false)
      }
    }
    autoGerar().catch(() => undefined)

    return () => {
      cancelled = true
      setAutoGerando(false)
    }
    // Usar flag booleana evita reexecutar/cancelar quando o snapshot é atualizado
    // após a geração (nova referência de objeto), o que deixava o botão em "Gerando…".
  }, [projetoId, podeEditar, snapshotCarregado, notificarResultadoGeracao, showToast, autoGerarKey])

  const onReavaliarPendencias = useCallback(async () => {
    if (!projetoId || !podeEditar) return
    try {
      const data = await reavaliarPendenciasMutation.mutateAsync()
      const r = data.reavaliacao
      if (r) {
        const erros = r.erros ?? []
        const naoMap = r.categorias_nao_mapeadas ?? []
        const msgBase = `Pendências abertas: ${r.pendencias_abertas_antes} → ${r.pendencias_abertas_depois}. Categorias reavaliadas: ${r.categorias_reavaliadas.length}.`
        if (erros.length > 0 || naoMap.length > 0) {
          const extra = [
            ...naoMap.map((c) => `Sem regra automática: ${c}`),
            ...erros.map((e) => `${e.categoria_produto}: ${e.erro}`),
          ].join(' · ')
          showToast({
            variant: 'warning',
            title: 'Reavaliação concluída com avisos',
            message: `${msgBase} ${extra}`,
          })
        } else {
          showToast({ variant: 'success', message: msgBase })
        }
      } else {
        showToast({ variant: 'success', message: 'Pendências reavaliadas.' })
      }
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível reavaliar pendências',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [projetoId, podeEditar, reavaliarPendenciasMutation, showToast])

  const onAprovar = useCallback(
    async (sugestaoId: string, produtoId?: string | null) => {
      if (!podeEditar) return
      try {
        await aprovarMutation.mutateAsync({ sugestaoId, produtoId })
        showToast({ variant: 'success', message: 'Item aprovado na composição.' })
        setAlterarSugestao(null)
      } catch (err) {
        tratarErroAprovacao(err, 'Não foi possível aprovar')
      }
    },
    [podeEditar, aprovarMutation, showToast, setAlterarSugestao, tratarErroAprovacao]
  )

  const onReabrirItemAprovado = useCallback(async () => {
    if (!itemReabrir || !podeEditar) return
    try {
      await reabrirComposicaoItemMutation.mutateAsync({ composicaoItemId: itemReabrir.id })
      showToast({
        variant: 'success',
        message: 'Item reaberto e devolvido para sugestões de itens.',
      })
      setItemReabrir(null)
    } catch (err) {
      tratarErroAprovacao(err, 'Não foi possível reabrir item aprovado')
    }
  }, [
    itemReabrir,
    podeEditar,
    reabrirComposicaoItemMutation,
    setItemReabrir,
    tratarErroAprovacao,
  ])

  const onAprovarTodas = useCallback(async () => {
    const sugestoesParaAprovar = snapshot?.sugestoes.filter(
      filtrarSugestaoAprovar ?? (() => true)
    ) ?? []
    if (!podeEditar || sugestoesParaAprovar.length === 0) return
    try {
      setAprovandoTodas(true)
      for (const sugestao of sugestoesParaAprovar) {
        await aprovarMutation.mutateAsync({ sugestaoId: sugestao.id, produtoId: null })
      }
      showToast({ variant: 'success', message: 'Todas as sugestões foram aprovadas.' })
    } catch (err) {
      tratarErroAprovacao(err, 'Não foi possível aprovar todas')
    } finally {
      setAprovandoTodas(false)
    }
  }, [
    aprovarMutation,
    filtrarSugestaoAprovar,
    podeEditar,
    showToast,
    snapshot?.sugestoes,
    setAprovandoTodas,
    tratarErroAprovacao,
  ])

  const executarExportacao = useCallback(
    async (fmt: 'pdf' | 'xlsx') => {
      if (!projetoId) return
      setExportando(fmt)
      try {
        const nomeProjeto = montarNomeArquivoProjeto(
          projetoSelecionado?.codigo ?? snapshot?.projeto_codigo,
          projetoSelecionado?.cliente,
          projetoSelecionado?.nome ?? snapshot?.projeto_nome
        )
        if (fmt === 'xlsx') await exportarComposicaoListaXlsx(projetoId, nomeProjeto)
        else await exportarComposicaoListaPdf(projetoId, nomeProjeto)
        showToast({ variant: 'success', message: 'Download iniciado.' })
      } catch (err) {
        console.error(err)
        showToast({
          variant: 'danger',
          title: 'Falha na exportação',
          message: extrairMensagemErroApi(err) || 'Tente novamente.',
        })
      } finally {
        setExportando(null)
      }
    },
    [projetoId, projetoSelecionado, showToast, snapshot, setExportando]
  )

  const onExportLista = useCallback(
    (fmt: 'pdf' | 'xlsx') => {
      if (!projetoId) return
      if ((snapshot?.pendencias.length ?? 0) > 0) {
        setConfirmExportFmt(fmt)
        return
      }
      executarExportacao(fmt).catch(() => undefined)
    },
    [executarExportacao, projetoId, snapshot, setConfirmExportFmt]
  )

  const gerandoSugestoes = autoGerando || gerarMutation.isPending

  return {
    gerarMutation,
    autoGerando,
    gerandoSugestoes,
    reavaliarPendenciasMutation,
    aprovarMutation,
    reabrirComposicaoItemMutation,
    onGerar,
    onReavaliarPendencias,
    onAprovar,
    onReabrirItemAprovado,
    onAprovarTodas,
    executarExportacao,
    onExportLista,
  }
}

/** Sincroniza seleção de projeto com query string `?projeto=`. */
export function useComposicaoProjetoChange(
  setSearchParams: (params: Record<string, string> | URLSearchParams, opts?: { replace?: boolean }) => void
) {
  return useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value
      if (v) setSearchParams({ projeto: v })
      else setSearchParams({})
    },
    [setSearchParams]
  )
}
