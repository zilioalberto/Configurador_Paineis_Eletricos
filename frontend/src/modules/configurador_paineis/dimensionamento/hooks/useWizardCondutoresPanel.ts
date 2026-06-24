/**
 * Estado e ações do painel de revisão de condutores no wizard:
 * overrides locais, aprovação, recálculo e PATCH para a API.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { runPatchWithToast } from '../utils/runPatchWithToast'
import {
  buildOverridesCircuito,
  estaAprovado,
  overrideBitolaAgCoerente,
  parseNum,
  toPayloadNull,
  type OverridesCircuito,
} from '../utils/wizardCondutoresUtils'
import { useDimensionamentoQuery } from './useDimensionamentoQuery'
import { usePatchCondutoresDimensionamentoMutation } from './usePatchCondutoresDimensionamentoMutation'
import { useRecalcularDimensionamentoMutation } from './useRecalcularDimensionamentoMutation'
import type { CircuitoCargaCondutores, PatchCondutoresPayload } from '../types/dimensionamento'

export function useWizardCondutoresPanel(projetoId: string) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const canEditar = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
  const { data: dim, isPending, isError, error } = useDimensionamentoQuery(projetoId)
  const recalc = useRecalcularDimensionamentoMutation(projetoId || null)
  const patchMut = usePatchCondutoresDimensionamentoMutation(projetoId || null)

  const tabela = useMemo(
    () => dim?.condutores_tabela_referencia ?? [],
    [dim?.condutores_tabela_referencia]
  )
  const circuitos = useMemo(() => dim?.circuitos_carga ?? [], [dim?.circuitos_carga])
  const ag = dim?.alimentacao_geral ?? null

  const [circuitoOv, setCircuitoOv] = useState<Record<string, OverridesCircuito>>({})
  const [agOv, setAgOv] = useState<OverridesCircuito | null>(null)

  useEffect(() => {
    if (!dim?.circuitos_carga) return
    const next: Record<string, OverridesCircuito> = {}
    for (const c of dim.circuitos_carga) {
      next[c.id] = buildOverridesCircuito(c)
    }
    setCircuitoOv(next)
  }, [dim?.atualizado_em, dim?.circuitos_carga])

  useEffect(() => {
    if (!ag) {
      setAgOv(null)
      return
    }
    setAgOv({
      fase: overrideBitolaAgCoerente(ag.secao_condutor_fase_escolhida_mm2),
      neutro: overrideBitolaAgCoerente(ag.secao_condutor_neutro_escolhida_mm2),
      pe: overrideBitolaAgCoerente(ag.secao_condutor_pe_escolhida_mm2),
    })
  }, [ag, dim?.atualizado_em])

  const payloadUmCircuito = useCallback(
    (c: CircuitoCargaCondutores): PatchCondutoresPayload => {
      const o = circuitoOv[c.id] ?? buildOverridesCircuito(c)
      return {
        circuitos: [
          {
            id: c.id,
            secao_condutor_fase_escolhida_mm2: toPayloadNull(o.fase),
            secao_condutor_neutro_escolhida_mm2: c.possui_neutro ? toPayloadNull(o.neutro) : null,
            secao_condutor_pe_escolhida_mm2: c.possui_pe ? toPayloadNull(o.pe) : null,
          },
        ],
        alimentacao_geral: {},
        confirmar_revisao: false,
      }
    },
    [circuitoOv]
  )

  const montarPayloadTodos = useCallback(
    (confirmarRevisao: boolean): PatchCondutoresPayload => {
      const circuitosPayload = circuitos.map((c) => {
        const o = circuitoOv[c.id] ?? buildOverridesCircuito(c)
        return {
          id: c.id,
          secao_condutor_fase_escolhida_mm2: toPayloadNull(o.fase),
          secao_condutor_neutro_escolhida_mm2: c.possui_neutro ? toPayloadNull(o.neutro) : null,
          secao_condutor_pe_escolhida_mm2: c.possui_pe ? toPayloadNull(o.pe) : null,
        }
      })
      const alimentacao_geral =
        ag && agOv
          ? {
              secao_condutor_fase_escolhida_mm2: toPayloadNull(agOv.fase),
              secao_condutor_neutro_escolhida_mm2: ag.possui_neutro
                ? toPayloadNull(agOv.neutro)
                : null,
              secao_condutor_pe_escolhida_mm2: ag.possui_terra ? toPayloadNull(agOv.pe) : null,
            }
          : {}
      return {
        circuitos: circuitosPayload,
        alimentacao_geral,
        confirmar_revisao: confirmarRevisao,
      }
    },
    [ag, agOv, circuitos, circuitoOv]
  )

  const payloadSomenteAlimentacao = useCallback((): PatchCondutoresPayload | null => {
    if (!ag || !agOv) return null
    return {
      circuitos: [],
      alimentacao_geral: {
        secao_condutor_fase_escolhida_mm2: toPayloadNull(agOv.fase),
        secao_condutor_neutro_escolhida_mm2: ag.possui_neutro ? toPayloadNull(agOv.neutro) : null,
        secao_condutor_pe_escolhida_mm2: ag.possui_terra ? toPayloadNull(agOv.pe) : null,
        condutores_aprovado: true,
      },
      confirmar_revisao: false,
    }
  }, [ag, agOv])

  const onAprovarCircuito = useCallback(
    (c: CircuitoCargaCondutores) =>
      runPatchWithToast(
        async () => {
          const p = payloadUmCircuito(c)
          const row = p.circuitos?.[0]
          const payload: PatchCondutoresPayload = row
            ? { ...p, circuitos: [{ ...row, condutores_aprovado: true }] }
            : p
          await patchMut.mutateAsync(payload)
        },
        showToast,
        {
          successMessage: `Bitolas da carga ${c.carga_tag} aprovadas.`,
          errorTitle: 'Não foi possível aprovar',
        }
      ),
    [payloadUmCircuito, patchMut, showToast]
  )

  const onRevisarCircuito = useCallback(
    (c: CircuitoCargaCondutores) =>
      runPatchWithToast(
        () =>
          patchMut.mutateAsync({
            circuitos: [{ id: c.id, condutores_aprovado: false }],
            alimentacao_geral: {},
            confirmar_revisao: false,
          }),
        showToast,
        {
          successMessage: `Carga ${c.carga_tag} voltou para sugestões; pode reavaliar as bitolas.`,
          errorTitle: 'Não foi possível reabrir',
        }
      ),
    [patchMut, showToast]
  )

  const onUsarSugestaoCircuito = useCallback(
    (c: CircuitoCargaCondutores) =>
      runPatchWithToast(
        () =>
          patchMut.mutateAsync({
            circuitos: [
              {
                id: c.id,
                secao_condutor_fase_escolhida_mm2: null,
                secao_condutor_neutro_escolhida_mm2: null,
                secao_condutor_pe_escolhida_mm2: null,
              },
            ],
            alimentacao_geral: {},
            confirmar_revisao: false,
          }),
        showToast,
        {
          successMessage: `Sugestões do sistema restauradas para ${c.carga_tag}.`,
          errorTitle: 'Não foi possível restaurar',
        }
      ),
    [patchMut, showToast]
  )

  const onAprovarAlimentacao = useCallback(() => {
    const p = payloadSomenteAlimentacao()
    if (!p) return Promise.resolve()
    return runPatchWithToast(() => patchMut.mutateAsync(p), showToast, {
      successMessage: 'Alimentação geral aprovada.',
      errorTitle: 'Não foi possível aprovar',
    })
  }, [payloadSomenteAlimentacao, patchMut, showToast])

  const onRevisarAlimentacao = useCallback(
    () =>
      runPatchWithToast(
        () =>
          patchMut.mutateAsync({
            circuitos: [],
            alimentacao_geral: { condutores_aprovado: false },
            confirmar_revisao: false,
          }),
        showToast,
        {
          successMessage: 'Alimentação geral voltou para sugestões.',
          errorTitle: 'Não foi possível reabrir',
        }
      ),
    [patchMut, showToast]
  )

  const onUsarSugestaoAlimentacao = useCallback(() => {
    if (!ag) return Promise.resolve()
    return runPatchWithToast(
      () =>
        patchMut.mutateAsync({
          circuitos: [],
          alimentacao_geral: {
            secao_condutor_fase_escolhida_mm2: null,
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: null,
          },
          confirmar_revisao: false,
        }),
      showToast,
      {
        successMessage: 'Sugestões do sistema restauradas (alimentação geral).',
        errorTitle: 'Não foi possível restaurar',
      }
    )
  }, [ag, patchMut, showToast])

  const onAprovarTodas = useCallback(
    () =>
      runPatchWithToast(() => patchMut.mutateAsync(montarPayloadTodos(true)), showToast, {
        successMessage:
          'Todas as bitolas foram gravadas e a revisão de condutores foi confirmada.',
        errorTitle: 'Não foi possível aprovar todas',
      }),
    [montarPayloadTodos, patchMut, showToast]
  )

  const onRestaurarSugestoes = useCallback(
    () =>
      runPatchWithToast(
        () =>
          patchMut.mutateAsync({
            circuitos: circuitos.map((c) => ({
              id: c.id,
              secao_condutor_fase_escolhida_mm2: null as string | null,
              secao_condutor_neutro_escolhida_mm2: null as string | null,
              secao_condutor_pe_escolhida_mm2: null as string | null,
              condutores_aprovado: false,
            })),
            alimentacao_geral: ag
              ? {
                  secao_condutor_fase_escolhida_mm2: null,
                  secao_condutor_neutro_escolhida_mm2: null,
                  secao_condutor_pe_escolhida_mm2: null,
                  condutores_aprovado: false,
                }
              : {},
            confirmar_revisao: false,
          }),
        showToast,
        {
          successMessage: 'Todas as linhas voltaram às sugestões do sistema.',
          errorTitle: 'Não foi possível restaurar',
        }
      ),
    [ag, circuitos, patchMut, showToast]
  )

  const ibPainel = useMemo(() => parseNum(dim?.corrente_total_painel_a), [dim?.corrente_total_painel_a])

  const circuitosPendentes = useMemo(
    () => circuitos.filter((c) => !estaAprovado(c)),
    [circuitos]
  )
  const circuitosAprovadosLista = useMemo(
    () => circuitos.filter((c) => estaAprovado(c)),
    [circuitos]
  )

  const agAprovado = Boolean(ag?.condutores_aprovado)
  const todosCircuitosEAgAprovados =
    circuitos.length > 0 && circuitosPendentes.length === 0 && (ag ? agAprovado : true)
  const revisaoEfetivaOk =
    Boolean(dim?.condutores_revisao_confirmada) || todosCircuitosEAgAprovados
  const podeAprovarTodas =
    canEditar &&
    !revisaoEfetivaOk &&
    (circuitos.length > 0 || Boolean(ag)) &&
    !patchMut.isPending
  const bloquearEdicao = revisaoEfetivaOk

  return {
    dim,
    isPending,
    isError,
    error,
    recalc,
    patchMut,
    tabela,
    circuitos,
    ag,
    agOv,
    setAgOv,
    circuitoOv,
    setCircuitoOv,
    canEditar,
    ibPainel,
    circuitosPendentes,
    circuitosAprovadosLista,
    agAprovado,
    revisaoEfetivaOk,
    podeAprovarTodas,
    bloquearEdicao,
    onAprovarCircuito,
    onRevisarCircuito,
    onUsarSugestaoCircuito,
    onAprovarAlimentacao,
    onRevisarAlimentacao,
    onUsarSugestaoAlimentacao,
    onAprovarTodas,
    onRestaurarSugestoes,
  }
}
