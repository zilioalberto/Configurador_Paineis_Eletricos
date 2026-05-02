import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useDimensionamentoQuery } from '../hooks/useDimensionamentoQuery'
import { usePatchCondutoresDimensionamentoMutation } from '../hooks/usePatchCondutoresDimensionamentoMutation'
import { useRecalcularDimensionamentoMutation } from '../hooks/useRecalcularDimensionamentoMutation'
import type {
  CircuitoCargaCondutores,
  PatchCondutoresPayload,
  TabelaReferenciaCondutor,
} from '../types/dimensionamento'

const SUGESTAO = '__sugestao__'

function parseNum(s: string | null | undefined): number {
  if (s == null || s === '') return 0
  return Number(String(s).replace(',', '.'))
}

function opcoesBitolaFase(
  tabela: TabelaReferenciaCondutor[],
  circuito: CircuitoCargaCondutores
): string[] {
  const ib = parseNum(circuito.corrente_referencia_a)
  if (circuito.classificacao_circuito !== 'POTENCIA' || ib <= 0) {
    return tabela.map((t) => t.secao_mm2)
  }
  return tabela.filter((t) => parseNum(t.iz_a) >= ib).map((t) => t.secao_mm2)
}

function opcoesBitolaNeutro(
  tabela: TabelaReferenciaCondutor[],
  circuito: CircuitoCargaCondutores
): string[] {
  if (!circuito.possui_neutro) return []
  return opcoesBitolaFase(tabela, circuito)
}

function opcoesBitolaAlimentacao(
  tabela: TabelaReferenciaCondutor[],
  ib: number
): string[] {
  if (ib <= 0) return tabela.map((t) => t.secao_mm2)
  return tabela.filter((t) => parseNum(t.iz_a) >= ib).map((t) => t.secao_mm2)
}

function opcoesBitolaPe(tabela: TabelaReferenciaCondutor[]): string[] {
  return tabela.map((t) => t.secao_mm2)
}

type OverridesCircuito = {
  fase: string
  neutro: string
  pe: string
}

type OverridesAg = {
  fase: string
  neutro: string
  pe: string
}

function buildOverridesCircuito(c: CircuitoCargaCondutores): OverridesCircuito {
  return {
    fase: c.secao_condutor_fase_escolhida_mm2 ?? SUGESTAO,
    neutro: c.secao_condutor_neutro_escolhida_mm2 ?? SUGESTAO,
    pe: c.secao_condutor_pe_escolhida_mm2 ?? SUGESTAO,
  }
}

function estaAprovado(c: CircuitoCargaCondutores): boolean {
  return Boolean(c.condutores_aprovado)
}

type Props = {
  projetoId: string
  /** Sem cartão azul nem título duplicado — usar com `DimensionamentoWizardShell`. */
  embedded?: boolean
}

export default function WizardCondutoresPanel({ projetoId, embedded = false }: Props) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const canEditar = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
  const { data: dim, isPending, isError, error } = useDimensionamentoQuery(projetoId)
  const recalc = useRecalcularDimensionamentoMutation(projetoId || null)
  const patchMut = usePatchCondutoresDimensionamentoMutation(projetoId || null)

  const tabela = dim?.condutores_tabela_referencia ?? []
  const circuitos = dim?.circuitos_carga ?? []
  const ag = dim?.alimentacao_geral ?? null

  const [circuitoOv, setCircuitoOv] = useState<Record<string, OverridesCircuito>>({})
  const [agOv, setAgOv] = useState<OverridesAg | null>(null)

  const circuitosIdsKey = useMemo(
    () =>
      circuitos
        .map((c) => c.id)
        .sort()
        .join(','),
    [circuitos]
  )

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
      fase: ag.secao_condutor_fase_escolhida_mm2 ?? SUGESTAO,
      neutro: ag.secao_condutor_neutro_escolhida_mm2 ?? SUGESTAO,
      pe: ag.secao_condutor_pe_escolhida_mm2 ?? SUGESTAO,
    })
  }, [ag?.id, ag?.secao_condutor_fase_escolhida_mm2, dim?.atualizado_em])

  const toPayloadNull = (v: string): string | null => (v === SUGESTAO ? null : v)

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
    async (c: CircuitoCargaCondutores) => {
      const p = payloadUmCircuito(c)
      const row = p.circuitos?.[0]
      const payload: PatchCondutoresPayload = row
        ? {
            ...p,
            circuitos: [{ ...row, condutores_aprovado: true }],
          }
        : p
      await patchMut.mutateAsync(payload)
      showToast({ variant: 'success', message: `Bitolas da carga ${c.carga_tag} aprovadas.` })
    },
    [payloadUmCircuito, patchMut, showToast]
  )

  const onRevisarCircuito = useCallback(
    async (c: CircuitoCargaCondutores) => {
      await patchMut.mutateAsync({
        circuitos: [{ id: c.id, condutores_aprovado: false }],
        alimentacao_geral: {},
        confirmar_revisao: false,
      })
      showToast({
        variant: 'success',
        message: `Carga ${c.carga_tag} voltou para sugestões; pode reavaliar as bitolas.`,
      })
    },
    [patchMut, showToast]
  )

  const onUsarSugestaoCircuito = useCallback(
    async (c: CircuitoCargaCondutores) => {
      await patchMut.mutateAsync({
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
      })
      showToast({
        variant: 'success',
        message: `Sugestões do sistema restauradas para ${c.carga_tag}.`,
      })
    },
    [patchMut, showToast]
  )

  const onAprovarAlimentacao = useCallback(async () => {
    const p = payloadSomenteAlimentacao()
    if (!p) return
    await patchMut.mutateAsync(p)
    showToast({ variant: 'success', message: 'Alimentação geral aprovada.' })
  }, [payloadSomenteAlimentacao, patchMut, showToast])

  const onRevisarAlimentacao = useCallback(async () => {
    await patchMut.mutateAsync({
      circuitos: [],
      alimentacao_geral: { condutores_aprovado: false },
      confirmar_revisao: false,
    })
    showToast({
      variant: 'success',
      message: 'Alimentação geral voltou para sugestões.',
    })
  }, [patchMut, showToast])

  const onUsarSugestaoAlimentacao = useCallback(async () => {
    if (!ag) return
    await patchMut.mutateAsync({
      circuitos: [],
      alimentacao_geral: {
        secao_condutor_fase_escolhida_mm2: null,
        secao_condutor_neutro_escolhida_mm2: null,
        secao_condutor_pe_escolhida_mm2: null,
      },
      confirmar_revisao: false,
    })
    showToast({ variant: 'success', message: 'Sugestões do sistema restauradas (alimentação geral).' })
  }, [ag, patchMut, showToast])

  const onAprovarTodas = useCallback(async () => {
    await patchMut.mutateAsync(montarPayloadTodos(true))
    showToast({
      variant: 'success',
      message: 'Todas as bitolas foram gravadas e a revisão de condutores foi confirmada.',
    })
  }, [montarPayloadTodos, patchMut, showToast])

  const onRestaurarSugestoes = useCallback(async () => {
    const circuitosPayload = circuitos.map((c) => ({
      id: c.id,
      secao_condutor_fase_escolhida_mm2: null as string | null,
      secao_condutor_neutro_escolhida_mm2: null as string | null,
      secao_condutor_pe_escolhida_mm2: null as string | null,
      condutores_aprovado: false,
    }))
    await patchMut.mutateAsync({
      circuitos: circuitosPayload,
      alimentacao_geral: ag
        ? {
            secao_condutor_fase_escolhida_mm2: null,
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: null,
            condutores_aprovado: false,
          }
        : {},
      confirmar_revisao: false,
    })
    showToast({ variant: 'success', message: 'Todas as linhas voltaram às sugestões do sistema.' })
  }, [ag, circuitos, patchMut, showToast])

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
    circuitos.length > 0 &&
    circuitosPendentes.length === 0 &&
    (ag ? agAprovado : true)

  const revisaoEfetivaOk =
    Boolean(dim?.condutores_revisao_confirmada) || todosCircuitosEAgAprovados

  const podeAprovarTodas =
    canEditar &&
    !revisaoEfetivaOk &&
    (circuitos.length > 0 || Boolean(ag)) &&
    !patchMut.isPending

  const bloquearEdicao = revisaoEfetivaOk

  if (isPending) {
    return <p className="text-muted mb-0">Carregando dimensionamento de condutores...</p>
  }
  if (isError) {
    return (
      <div className="alert alert-danger" role="alert">
        {error instanceof Error ? error.message : 'Não foi possível carregar o dimensionamento.'}
      </div>
    )
  }
  if (!dim) {
    return <p className="text-muted mb-0">Sem dados de dimensionamento.</p>
  }

  const toolbarIntro = embedded ? null : (
    <>
      <h2 className="h5 mb-1">Condutores (revisão)</h2>
      <p className="small text-muted mb-0">
        Ajuste as bitolas (Iz mínimo, tabela B1 simplificada). <strong>Aprovar</strong> move o circuito
        para a tabela de aprovados; <strong>Revisar</strong> devolve às sugestões.{' '}
        <strong>Aprovar todas</strong> confirma a revisão completa do projeto.
      </p>
      {revisaoEfetivaOk ? (
        <span className="badge bg-success mt-2">Revisão confirmada</span>
      ) : (
        <span className="badge bg-warning text-dark mt-2">Revisão pendente</span>
      )}
    </>
  )

  const toolbarActions = (
    <div className="d-flex flex-wrap gap-2 align-items-center">
      {embedded && (
        <>
          {revisaoEfetivaOk ? (
            <span className="badge bg-success">Revisão confirmada</span>
          ) : (
            <span className="badge bg-warning text-dark">Revisão pendente</span>
          )}
        </>
      )}
      {podeAprovarTodas ? (
        <button
          type="button"
          className={`btn ${embedded ? 'btn-success' : 'btn-sm btn-success'}`}
          disabled={patchMut.isPending || recalc.isPending}
          onClick={() =>
            void onAprovarTodas().catch((err) => {
              console.error(err)
              showToast({
                variant: 'danger',
                title: 'Não foi possível aprovar todas',
                message: extrairMensagemErroApi(err) || 'Tente novamente.',
              })
            })
          }
        >
          {patchMut.isPending ? 'Aprovando…' : 'Aprovar todas'}
        </button>
      ) : null}
      <button
        type="button"
        className={`btn ${embedded ? 'btn-outline-primary' : 'btn-sm btn-outline-primary'}`}
        disabled={!canEditar || recalc.isPending}
        onClick={() => void recalc.mutateAsync()}
      >
        {recalc.isPending ? 'Recalculando...' : 'Recalcular dimensionamento'}
      </button>
    </div>
  )

  const body = (
    <>
      <div
        className={`d-flex flex-wrap justify-content-between align-items-start gap-3 ${embedded ? 'mb-4' : 'mb-3'}`}
      >
        <div>{toolbarIntro}</div>
        {toolbarActions}
      </div>

        {circuitos.length === 0 ? (
          <p className="text-muted small mb-0">Nenhum circuito de carga dimensionado (sem cargas ativas?).</p>
        ) : (
          <>
            <h2 className="h5 mb-3">Condutores aprovados</h2>
            {circuitosAprovadosLista.length === 0 ? (
              <p className="text-muted small mb-3">Nenhum circuito aprovado ainda.</p>
            ) : (
              <div className="table-responsive mb-4 app-data-table">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>I ref (A)</th>
                      <th>Fase (efetiva)</th>
                      <th>Neutro</th>
                      <th>PE</th>
                      {canEditar ? <th className="text-end">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {circuitosAprovadosLista.map((c) => (
                      <tr key={`aprov-${c.id}`}>
                        <td>
                          <strong>{c.carga_tag}</strong>
                          <div className="small text-muted">{c.classificacao_circuito}</div>
                        </td>
                        <td>{c.corrente_referencia_a ?? '—'}</td>
                        <td>{c.secao_condutor_fase_efetiva_mm2 ?? '—'} mm²</td>
                        <td>
                          {!c.possui_neutro ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <>{c.secao_condutor_neutro_efetiva_mm2 ?? '—'} mm²</>
                          )}
                        </td>
                        <td>
                          {!c.possui_pe ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <>{c.secao_condutor_pe_efetiva_mm2 ?? '—'} mm²</>
                          )}
                        </td>
                        {canEditar ? (
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              disabled={patchMut.isPending}
                              onClick={() =>
                                void onRevisarCircuito(c).catch((err) => {
                                  console.error(err)
                                  showToast({
                                    variant: 'danger',
                                    title: 'Não foi possível reabrir',
                                    message: extrairMensagemErroApi(err) || 'Tente novamente.',
                                  })
                                })
                              }
                            >
                              Revisar
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h2 className="h5 mb-0">Sugestões (pendentes)</h2>
            </div>
            {circuitosPendentes.length === 0 ? (
              <p className="text-muted small mb-4">
                Nenhuma sugestão pendente{revisaoEfetivaOk ? ' (revisão confirmada).' : '.'}
              </p>
            ) : (
              <div className="table-responsive mb-4 app-data-table">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>I ref (A)</th>
                      <th>Fase</th>
                      <th>Neutro</th>
                      <th>PE</th>
                      {canEditar ? <th className="text-end">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {circuitosPendentes.map((c) => {
                      const ov = circuitoOv[c.id] ?? buildOverridesCircuito(c)
                      const opF = opcoesBitolaFase(tabela, c)
                      const opN = opcoesBitolaNeutro(tabela, c)
                      const opP = opcoesBitolaPe(tabela)
                      const setO = (patch: Partial<OverridesCircuito>) => {
                        setCircuitoOv((prev) => ({
                          ...prev,
                          [c.id]: { ...ov, ...patch },
                        }))
                      }
                      return (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.carga_tag}</strong>
                            <div className="small text-muted">{c.classificacao_circuito}</div>
                          </td>
                          <td>{c.corrente_referencia_a ?? '—'}</td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              disabled={!canEditar || patchMut.isPending || bloquearEdicao}
                              value={ov.fase}
                              onChange={(e) => setO({ fase: e.target.value })}
                            >
                              <option value={SUGESTAO}>
                                Sugestão ({c.secao_condutor_fase_mm2 ?? '—'} mm²)
                              </option>
                              {opF.map((s) => (
                                <option key={s} value={s}>
                                  {s} mm²
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {!c.possui_neutro ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <select
                                className="form-select form-select-sm"
                                disabled={!canEditar || patchMut.isPending || bloquearEdicao}
                                value={ov.neutro}
                                onChange={(e) => setO({ neutro: e.target.value })}
                              >
                                <option value={SUGESTAO}>
                                  Sugestão ({c.secao_condutor_neutro_mm2 ?? '—'} mm²)
                                </option>
                                {opN.map((s) => (
                                  <option key={s} value={s}>
                                    {s} mm²
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td>
                            {!c.possui_pe ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <select
                                className="form-select form-select-sm"
                                disabled={!canEditar || patchMut.isPending || bloquearEdicao}
                                value={ov.pe}
                                onChange={(e) => setO({ pe: e.target.value })}
                              >
                                <option value={SUGESTAO}>
                                  Sugestão ({c.secao_condutor_pe_mm2 ?? '—'} mm²)
                                </option>
                                {opP.map((s) => (
                                  <option key={s} value={s}>
                                    {s} mm²
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          {canEditar ? (
                            <td className="text-end text-nowrap">
                              <div className="d-flex flex-wrap gap-1 justify-content-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={patchMut.isPending || bloquearEdicao}
                                  onClick={() =>
                                    void onUsarSugestaoCircuito(c).catch((err) => {
                                      console.error(err)
                                      showToast({
                                        variant: 'danger',
                                        title: 'Não foi possível restaurar',
                                        message: extrairMensagemErroApi(err) || 'Tente novamente.',
                                      })
                                    })
                                  }
                                  title="Limpa escolhas e usa apenas o dimensionamento"
                                >
                                  Usar sugestão
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success"
                                  disabled={patchMut.isPending || bloquearEdicao}
                                  onClick={() =>
                                    void onAprovarCircuito(c).catch((err) => {
                                      console.error(err)
                                      showToast({
                                        variant: 'danger',
                                        title: 'Não foi possível aprovar',
                                        message: extrairMensagemErroApi(err) || 'Tente novamente.',
                                      })
                                    })
                                  }
                                >
                                  Aprovar
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {ag && agOv ? (
          <div className="mb-4">
            <h2 className="h5 mb-3">Alimentação geral do painel</h2>
            {agAprovado ? (
              <div className="table-responsive app-data-table">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>I total painel (A)</th>
                      <th>Fase (efetiva)</th>
                      <th>Neutro</th>
                      <th>PE</th>
                      {canEditar ? <th className="text-end">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{ag.corrente_total_painel_a}</td>
                      <td>{ag.secao_condutor_fase_efetiva_mm2 ?? '—'} mm²</td>
                      <td>
                        {!ag.possui_neutro ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <>{ag.secao_condutor_neutro_efetiva_mm2 ?? '—'} mm²</>
                        )}
                      </td>
                      <td>
                        {!ag.possui_terra ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <>{ag.secao_condutor_pe_efetiva_mm2 ?? '—'} mm²</>
                        )}
                      </td>
                      {canEditar ? (
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            disabled={patchMut.isPending}
                            onClick={() =>
                              void onRevisarAlimentacao().catch((err) => {
                                console.error(err)
                                showToast({
                                  variant: 'danger',
                                  title: 'Não foi possível reabrir',
                                  message: extrairMensagemErroApi(err) || 'Tente novamente.',
                                })
                              })
                            }
                          >
                            Revisar
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive app-data-table">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>I total painel (A)</th>
                      <th>Fase</th>
                      <th>Neutro</th>
                      <th>PE</th>
                      {canEditar ? <th className="text-end">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{ag.corrente_total_painel_a}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          disabled={!canEditar || patchMut.isPending || bloquearEdicao}
                          value={agOv.fase}
                          onChange={(e) => setAgOv({ ...agOv, fase: e.target.value })}
                        >
                          <option value={SUGESTAO}>
                            Sugestão ({ag.secao_condutor_fase_mm2 ?? '—'} mm²)
                          </option>
                          {opcoesBitolaAlimentacao(tabela, ibPainel).map((s) => (
                            <option key={s} value={s}>
                              {s} mm²
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {!ag.possui_neutro ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <select
                            className="form-select form-select-sm"
                            disabled={!canEditar || patchMut.isPending || bloquearEdicao}
                            value={agOv.neutro}
                            onChange={(e) => setAgOv({ ...agOv, neutro: e.target.value })}
                          >
                            <option value={SUGESTAO}>
                              Sugestão ({ag.secao_condutor_neutro_mm2 ?? '—'} mm²)
                            </option>
                            {opcoesBitolaAlimentacao(tabela, ibPainel).map((s) => (
                              <option key={s} value={s}>
                                {s} mm²
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        {!ag.possui_terra ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <select
                            className="form-select form-select-sm"
                            disabled={!canEditar || patchMut.isPending || bloquearEdicao}
                            value={agOv.pe}
                            onChange={(e) => setAgOv({ ...agOv, pe: e.target.value })}
                          >
                            <option value={SUGESTAO}>
                              Sugestão ({ag.secao_condutor_pe_mm2 ?? '—'} mm²)
                            </option>
                            {opcoesBitolaPe(tabela).map((s) => (
                              <option key={s} value={s}>
                                {s} mm²
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      {canEditar ? (
                        <td className="text-end text-nowrap">
                          <div className="d-flex flex-wrap gap-1 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              disabled={patchMut.isPending || bloquearEdicao}
                              onClick={() =>
                                void onUsarSugestaoAlimentacao().catch((err) => {
                                  console.error(err)
                                  showToast({
                                    variant: 'danger',
                                    title: 'Não foi possível restaurar',
                                    message: extrairMensagemErroApi(err) || 'Tente novamente.',
                                  })
                                })
                              }
                            >
                              Usar sugestão
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              disabled={patchMut.isPending || bloquearEdicao}
                              onClick={() =>
                                void onAprovarAlimentacao().catch((err) => {
                                  console.error(err)
                                  showToast({
                                    variant: 'danger',
                                    title: 'Não foi possível aprovar',
                                    message: extrairMensagemErroApi(err) || 'Tente novamente.',
                                  })
                                })
                              }
                            >
                              Aprovar
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        <div className="d-flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            className={`btn btn-outline-secondary ${embedded ? '' : 'btn-sm'}`}
            disabled={!canEditar || patchMut.isPending || revisaoEfetivaOk}
            onClick={() =>
              void onRestaurarSugestoes().catch((err) => {
                console.error(err)
                showToast({
                  variant: 'danger',
                  title: 'Não foi possível restaurar',
                  message: extrairMensagemErroApi(err) || 'Tente novamente.',
                })
              })
            }
          >
            Usar apenas sugestões do sistema (todas as linhas)
          </button>
        </div>
    </>
  )

  if (embedded) {
    return <div className="dimensionamento-condutores-embed">{body}</div>
  }

  return (
    <div className="card border-primary mb-4">
      <div className="card-body">{body}</div>
    </div>
  )
}
