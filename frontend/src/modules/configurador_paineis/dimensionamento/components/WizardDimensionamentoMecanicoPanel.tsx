/** Painel da etapa de dimensionamento mecânico (placa, canaletas e painel comercial). */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useCalcularDimensionamentoMecanicoMutation } from '../hooks/useCalcularDimensionamentoMecanicoMutation'
import { useDimensionamentoMecanicoQuery } from '../hooks/useDimensionamentoMecanicoQuery'
import { useSalvarDimensionamentoMecanicoEscolhasMutation } from '../hooks/useSalvarDimensionamentoMecanicoEscolhasMutation'
import type {
  CanaletaCatalogo,
  ComponenteDisposicaoItem,
  DimensionamentoMecanicoDetalhe,
  PainelSugerido,
} from '../types/dimensionamento'
import { sugerirFaixasHorizontais } from '../utils/canaletasHorizontais'
import {
  calcularZonaUtilComponentes,
  validarZonaUtilComponentes,
} from '../utils/zonaUtilComponentes'
import {
  ajustarLayoutPlacaParaItens,
  expandirInstanciasComponentes,
  sugerirDisposicaoComponentes,
  validarDisposicaoComponentes,
} from '../utils/disposicaoComponentes'
import {
  gerarLayoutPlaca,
  type LayoutPlaca,
} from '../utils/layoutPlaca'
import {
  alturaReferenciaCanaletas,
  formFromDataMecanico,
  normalizarLayoutPlacaApi,
  sincronizarDisposicaoComItens,
  type FormStateMecanico,
} from '../utils/wizardDimensionamentoMecanicoUtils'
import PlacaCanaletasDiagram from './PlacaCanaletasDiagram'

type Props = {
  projetoId: string
  embedded?: boolean
}

type FormState = FormStateMecanico

const formFromData = formFromDataMecanico

function canaletasDisponiveis(data: DimensionamentoMecanicoDetalhe | undefined) {
  return data?.canaletas_catalogo ?? (data?.canaleta ? [data.canaleta] : data?.canaleta_escolhida ? [data.canaleta_escolhida] : [])
}

function selecionarCanaletaPreview(
  data: DimensionamentoMecanicoDetalhe,
  form: FormState,
  canaletasCatalogo: CanaletaCatalogo[]
) {
  return (
    canaletasCatalogo.find((c) => c.produto_id === form.canaletaProdutoId) ??
    data.canaleta_escolhida ??
    data.canaleta ??
    null
  )
}

function selecionarPainelPreview(data: DimensionamentoMecanicoDetalhe, form: FormState) {
  return (
    data.paineis_sugeridos.find((p) => p.produto_id === form.painelProdutoId) ??
    data.painel_escolhido ??
    null
  )
}

function dimensoesPlacaPreview(
  data: DimensionamentoMecanicoDetalhe,
  form: FormState,
  canaleta: CanaletaCatalogo,
  painelSelecionado: PainelSugerido | null
) {
  const larguraBase = Number(canaleta.largura_base_mm)
  return {
    larguraBase,
    larguraPlaca: painelSelecionado
      ? Number(painelSelecionado.placa_largura_util_mm)
      : data.largura_zona_util_mm + form.canaletasVerticais * larguraBase,
    alturaPlaca: painelSelecionado
      ? Number(painelSelecionado.placa_altura_util_mm)
      : data.altura_zona_util_mm + form.faixasHorizontais * larguraBase,
  }
}

function calcularValidacaoPreview(
  data: DimensionamentoMecanicoDetalhe | undefined,
  form: FormState | null,
  canaletasCatalogo: CanaletaCatalogo[]
) {
  if (!data || !form) return null
  const canaleta = selecionarCanaletaPreview(data, form, canaletasCatalogo)
  if (!canaleta) return null
  const dimensoes = dimensoesPlacaPreview(data, form, canaleta, selecionarPainelPreview(data, form))
  const zona = calcularZonaUtilComponentes(
    dimensoes.larguraPlaca,
    dimensoes.alturaPlaca,
    form.canaletasVerticais,
    form.faixasHorizontais,
    dimensoes.larguraBase
  )
  return validarZonaUtilComponentes(zona, Number(data.area_componentes_mm2), form.taxaOcupacaoMax)
}

function calcularLayoutPreview(
  data: DimensionamentoMecanicoDetalhe | undefined,
  form: FormState | null,
  canaletasCatalogo: CanaletaCatalogo[],
  intermediariasY: number[]
) {
  if (!data || !form) return normalizarLayoutPlacaApi(data?.layout_placa)
  const canaleta = selecionarCanaletaPreview(data, form, canaletasCatalogo)
  if (!canaleta) return normalizarLayoutPlacaApi(data.layout_placa)
  const dimensoes = dimensoesPlacaPreview(data, form, canaleta, selecionarPainelPreview(data, form))
  const alturaPerfilCanaleta = Number(canaleta.altura_mm)
  return ajustarLayoutPlacaParaItens(
    gerarLayoutPlaca(
      dimensoes.larguraPlaca,
      dimensoes.alturaPlaca,
      form.canaletasVerticais,
      form.faixasHorizontais,
      dimensoes.larguraBase,
      intermediariasY,
      Number.isFinite(alturaPerfilCanaleta) && alturaPerfilCanaleta > 0
        ? alturaPerfilCanaleta
        : undefined
    ),
    data.itens_considerados
  )
}

function calcularFaixasSugeridasPreview(
  data: DimensionamentoMecanicoDetalhe | undefined,
  form: FormState | null,
  canaletasCatalogo: CanaletaCatalogo[]
) {
  if (!data || !form) return data?.faixas_horizontais_sugeridas ?? 2
  const canaleta = selecionarCanaletaPreview(data, form, canaletasCatalogo)
  const larguraBase = canaleta ? Number(canaleta.largura_base_mm) : 0
  return sugerirFaixasHorizontais(
    alturaReferenciaCanaletas(data, form.painelProdutoId),
    larguraBase,
    data.espacamento_max_horizontal_mm ?? 160
  )
}

type ValidacaoUi = Readonly<{ ok: boolean; alertas: string[] }>

type PreparacaoSalvar = Readonly<{
  erro?: { title: string; message: string }
  disposicaoParaSalvar: ComponenteDisposicaoItem[]
}>

function prepararSalvamentoDisposicao({
  data,
  form,
  validacaoPreview,
  validacaoDisposicao,
  layoutPreview,
  disposicao,
  instanciasEsperadas,
}: Readonly<{
  data: DimensionamentoMecanicoDetalhe | undefined
  form: FormState | null
  validacaoPreview: ValidacaoUi | null
  validacaoDisposicao: ValidacaoUi
  layoutPreview: LayoutPlaca | null | undefined
  disposicao: ComponenteDisposicaoItem[]
  instanciasEsperadas: number
}>): PreparacaoSalvar | null {
  if (!form || !data) return null
  if (validacaoPreview && !validacaoPreview.ok) {
    return {
      disposicaoParaSalvar: disposicao,
      erro: {
        title: 'Configuração inválida',
        message: validacaoPreview.alertas[0] ?? 'Ajuste canaletas ou painel antes de salvar.',
      },
    }
  }
  if (!validacaoDisposicao.ok) {
    return {
      disposicaoParaSalvar: disposicao,
      erro: {
        title: 'Disposição inválida',
        message:
          validacaoDisposicao.alertas[0] ??
          'Ajuste a posição dos componentes para não sobrepor canaletas.',
      },
    }
  }
  const disposicaoParaSalvar =
    layoutPreview && data.itens_considerados.length > 0
      ? sincronizarDisposicaoComItens(disposicao, layoutPreview, data.itens_considerados)
      : disposicao
  return validarDisposicaoParaSalvar(
    disposicaoParaSalvar,
    layoutPreview,
    instanciasEsperadas
  )
}

function validarDisposicaoParaSalvar(
  disposicaoParaSalvar: ComponenteDisposicaoItem[],
  layoutPreview: LayoutPlaca | null | undefined,
  instanciasEsperadas: number
): PreparacaoSalvar {
  if (instanciasEsperadas > 0 && disposicaoParaSalvar.length !== instanciasEsperadas) {
    return {
      disposicaoParaSalvar,
      erro: {
        title: 'Painel insuficiente',
        message:
          'A disposição automática não conseguiu encaixar todos os componentes. Escolha um painel maior, aumente as faixas úteis ou revise a canaleta.',
      },
    }
  }
  const alertas =
    layoutPreview && disposicaoParaSalvar.length > 0
      ? [...new Set(validarDisposicaoComponentes(disposicaoParaSalvar, layoutPreview))]
      : []
  return {
    disposicaoParaSalvar,
    erro: alertas.length
      ? { title: 'Disposição inválida', message: alertas[0] }
      : undefined,
  }
}

export default function WizardDimensionamentoMecanicoPanel({
  projetoId,
  embedded = false,
}: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canEditar = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
  const { data, isPending, isError, error } = useDimensionamentoMecanicoQuery(projetoId)
  const calcMut = useCalcularDimensionamentoMecanicoMutation(projetoId)
  const salvarMut = useSalvarDimensionamentoMecanicoEscolhasMutation(projetoId)

  const [form, setForm] = useState<FormState | null>(null)
  const [faixasManuais, setFaixasManuais] = useState(false)
  const [disposicao, setDisposicao] = useState<ComponenteDisposicaoItem[]>([])
  const [disposicaoDirty, setDisposicaoDirty] = useState(false)
  const [intermediariasY, setIntermediariasY] = useState<number[]>([])
  const projetoAnteriorRef = useRef<string | null>(null)

  useEffect(() => {
    if (!data) return
    const projetoMudou = projetoAnteriorRef.current !== projetoId
    projetoAnteriorRef.current = projetoId

    setForm(formFromData(data))
    setFaixasManuais(false)

    if (projetoMudou) {
      setDisposicaoDirty(false)
      setDisposicao([])
    }

    if (projetoMudou || !disposicaoDirty) {
      setIntermediariasY(
        data.canaletas_horizontais_intermediarias_y_mm ??
          data.layout_placa?.canaletas_horizontais_intermediarias_y_mm ??
          []
      )
    }
  }, [data, projetoId, disposicaoDirty])

  const canaletasCatalogo = useMemo(() => canaletasDisponiveis(data), [data])

  const validacaoPreview = useMemo(() => {
    return calcularValidacaoPreview(data, form, canaletasCatalogo)
  }, [canaletasCatalogo, data, form])

  const layoutPreview = useMemo(() => {
    return calcularLayoutPreview(data, form, canaletasCatalogo, intermediariasY)
  }, [canaletasCatalogo, data, form, intermediariasY])

  useEffect(() => {
    if (!data || !layoutPreview) return
    if (disposicaoDirty) return
    setDisposicao(
      sincronizarDisposicaoComItens(
        data.disposicao_componentes,
        layoutPreview,
        data.itens_considerados
      )
    )
  }, [data, layoutPreview, disposicaoDirty])

  const instanciasEsperadas = useMemo(
    () => (data ? expandirInstanciasComponentes(data.itens_considerados).length : 0),
    [data]
  )

  const disposicaoIncompleta =
    instanciasEsperadas > 0 && disposicao.length > 0 && disposicao.length !== instanciasEsperadas

  const validacaoDisposicao = useMemo(() => {
    if (!layoutPreview || disposicao.length === 0) {
      return { ok: true, alertas: [] as string[] }
    }
    const alertas = [...new Set(validarDisposicaoComponentes(disposicao, layoutPreview))]
    return { ok: alertas.length === 0, alertas }
  }, [disposicao, layoutPreview])

  const faixasSugeridasPreview = useMemo(() => {
    return calcularFaixasSugeridasPreview(data, form, canaletasCatalogo)
  }, [canaletasCatalogo, data, form])

  const onRecalcular = async () => {
    try {
      await calcMut.mutateAsync()
      showToast({ variant: 'success', message: 'Dimensionamento mecânico atualizado.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao calcular',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }

  const onSalvarEscolhas = async () => {
    if (!form || !data) return
    const preparacao = prepararSalvamentoDisposicao({
      data,
      form,
      validacaoPreview,
      validacaoDisposicao,
      layoutPreview,
      disposicao,
      instanciasEsperadas,
    })
    if (!preparacao) return
    if (preparacao.erro) {
      showToast({ variant: 'danger', ...preparacao.erro })
      return
    }
    try {
      await salvarMut.mutateAsync({
        painel_produto_id: form.painelProdutoId || null,
        canaleta_produto_id: form.canaletaProdutoId || null,
        canaletas_verticais: form.canaletasVerticais,
        faixas_horizontais: form.faixasHorizontais,
        taxa_ocupacao_max_percentual: form.taxaOcupacaoMax,
        disposicao_componentes: preparacao.disposicaoParaSalvar,
        canaletas_horizontais_intermediarias_y_mm:
          layoutPreview?.canaletas_horizontais_intermediarias_y_mm ?? intermediariasY,
      })
      setDisposicaoDirty(false)
      showToast({ variant: 'success', message: 'Painel, canaletas e disposição salvos.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao salvar',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }

  const onLayoutPlacaChange = useCallback(
    (layout: LayoutPlaca) => {
      setIntermediariasY(layout.canaletas_horizontais_intermediarias_y_mm)
      setDisposicaoDirty(true)
    },
    []
  )

  const onSelecionarPainel = useCallback(
    (produtoId: string) => {
      if (!data) return
      setForm((prev) => {
        const base = prev ?? formFromData(data)
        const next = { ...base, painelProdutoId: produtoId }
        if (!faixasManuais) {
          const canaleta =
            canaletasCatalogo.find((c) => c.produto_id === base.canaletaProdutoId) ??
            data.canaleta
          const larguraBase = canaleta ? Number(canaleta.largura_base_mm) : 0
          const alturaPlaca = alturaReferenciaCanaletas(data, produtoId)
          next.faixasHorizontais = sugerirFaixasHorizontais(
            alturaPlaca,
            larguraBase,
            data.espacamento_max_horizontal_mm ?? 160
          )
        }
        return next
      })
    },
    [canaletasCatalogo, data, faixasManuais]
  )

  const onSelecionarCanaleta = useCallback(
    (produtoId: string) => {
      if (!data) return
      setForm((prev) => {
        const base = prev ?? formFromData(data)
        const canaleta = canaletasCatalogo.find((c) => c.produto_id === produtoId)
        const larguraBase = canaleta ? Number(canaleta.largura_base_mm) : 0
        const alturaPlaca = alturaReferenciaCanaletas(data, base.painelProdutoId)
        return {
          ...base,
          canaletaProdutoId: produtoId,
          faixasHorizontais: faixasManuais
            ? base.faixasHorizontais
            : sugerirFaixasHorizontais(
                alturaPlaca,
                larguraBase,
                data.espacamento_max_horizontal_mm ?? 160
              ),
        }
      })
    },
    [canaletasCatalogo, data, faixasManuais]
  )

  if (isPending) {
    return <p className="text-muted mb-0">Carregando dimensionamento mecânico...</p>
  }
  if (isError) {
    return (
      <div className="alert alert-danger" role="alert">
        {error instanceof Error ? error.message : 'Não foi possível carregar o dimensionamento mecânico.'}
      </div>
    )
  }
  if (!data || !form) {
    return <p className="text-muted mb-0">Sem dados de dimensionamento mecânico.</p>
  }

  const painelSalvo = data.painel_escolhido

  return (
    <div className={embedded ? 'mb-4' : ''}>
      {!embedded ? (
        <>
          <h2 className="h5 mb-2">Dimensionamento mecânico do painel</h2>
          <p className="text-muted small mb-3">
            Escolha o painel comercial, a canaleta e as quantidades. A ocupação considera apenas
            componentes com montagem trilho DIN ou placa na especificação do catálogo. As faixas
            horizontais são sugeridas com base na altura da
            placa (mínimo superior + inferior; mais peças se a faixa livre exceder{' '}
            {data.espacamento_max_horizontal_mm ?? 160} mm).
          </p>
        </>
      ) : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {canEditar ? (
          <>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={calcMut.isPending}
              onClick={() => void onRecalcular()}
            >
              {calcMut.isPending ? 'Calculando…' : 'Recalcular composição'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={
                salvarMut.isPending ||
                validacaoPreview?.ok === false ||
                validacaoDisposicao.ok === false ||
                disposicaoIncompleta
              }
              onClick={() => void onSalvarEscolhas()}
            >
              {salvarMut.isPending ? 'Salvando…' : 'Salvar escolhas'}
            </button>
          </>
        ) : null}
      </div>

      {painelSalvo ? (
        <div className="alert alert-success py-2 mb-3" role="status">
          Painel salvo: <strong>{painelSalvo.produto_codigo}</strong> —{' '}
          {painelSalvo.placa_largura_util_mm} × {painelSalvo.placa_altura_util_mm} mm úteis
        </div>
      ) : null}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h6">Placa mínima calculada</h3>
              <p className="mb-1">
                <strong>
                  {data.largura_placa_min_mm} × {data.altura_placa_min_mm} mm
                </strong>
              </p>
              <p className="text-muted small mb-0">
                Profundidade mínima: {data.profundidade_min_mm} mm
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h6">Ocupação</h3>
              <p className="mb-1">
                Componentes: <strong>{data.area_componentes_mm2} mm²</strong>
              </p>
              <div className="mb-2">
                <label className="form-label small mb-1" htmlFor="dim-mec-taxa-max">
                  Taxa máx. de ocupação (%)
                </label>
                <input
                  id="dim-mec-taxa-max"
                  type="number"
                  min={1}
                  max={100}
                  step={0.01}
                  className="form-control form-control-sm"
                  value={form.taxaOcupacaoMax}
                  disabled={!canEditar}
                  onChange={(e) =>
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            taxaOcupacaoMax: Math.min(
                              100,
                              Math.max(1, Number(e.target.value) || 80)
                            ),
                          }
                        : prev
                    )
                  }
                />
              </div>
              <p className="text-muted small mb-0">
                Calculada na zona útil:{' '}
                <strong>
                  {validacaoPreview?.taxa_ocupacao_zona_percentual ??
                    data.taxa_ocupacao_calculada_percentual}{' '}
                  %
                </strong>
                {validacaoPreview ? (
                  <>
                    {' '}
                    — zona: {validacaoPreview.area_minima_necessaria_mm2} mm² mín.
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="h6">Canaletas configuradas</h3>
              <p className="mb-1">
                <strong>
                  {form.canaletasVerticais} verticais + {form.faixasHorizontais} horizontais
                </strong>
              </p>
              <p className="text-muted small mb-0">
                Sugestão automática: {faixasSugeridasPreview} horizontais (altura ref.{' '}
                {alturaReferenciaCanaletas(data, form.painelProdutoId)} mm)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h3 className="h6 mb-3">Configuração de canaletas</h3>
          {canaletasCatalogo.length === 0 ? (
            <div className="alert alert-warning mb-3" role="status">
              Nenhuma canaleta ativa no catálogo (categoria CANALETA). Cadastre produtos com
              especificação de canaleta para habilitar a seleção.
            </div>
          ) : (
            <div className="row g-3 mb-0">
              <div className="col-md-6">
                <label className="form-label small" htmlFor="dim-mec-canaleta">
                  Modelo de canaleta
                </label>
                <select
                  id="dim-mec-canaleta"
                  className="form-select form-select-sm"
                  value={form.canaletaProdutoId}
                  disabled={!canEditar}
                  onChange={(e) => onSelecionarCanaleta(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {canaletasCatalogo.map((c) => (
                    <option key={c.produto_id} value={c.produto_id}>
                      {c.produto_codigo} — base {c.largura_base_mm} × {c.altura_mm} mm
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small" htmlFor="dim-mec-verticais">
                  Canaletas verticais
                </label>
                <input
                  id="dim-mec-verticais"
                  type="number"
                  min={0}
                  max={8}
                  className="form-control form-control-sm"
                  value={form.canaletasVerticais}
                  disabled={!canEditar}
                  onChange={(e) =>
                    setForm((prev) =>
                      prev
                        ? { ...prev, canaletasVerticais: Math.max(0, Number(e.target.value) || 0) }
                        : prev
                    )
                  }
                />
                <p className="text-muted small mb-0 mt-1">Padrão: 2 (laterais)</p>
              </div>
              <div className="col-md-3">
                <label className="form-label small" htmlFor="dim-mec-horizontais">
                  Faixas horizontais
                </label>
                <input
                  id="dim-mec-horizontais"
                  type="number"
                  min={2}
                  max={12}
                  className="form-control form-control-sm"
                  value={form.faixasHorizontais}
                  disabled={!canEditar}
                  onChange={(e) => {
                    setFaixasManuais(true)
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            faixasHorizontais: Math.max(2, Number(e.target.value) || 2),
                          }
                        : prev
                    )
                  }}
                />
                <p className="text-muted small mb-0 mt-1">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 align-baseline"
                    disabled={!canEditar}
                    onClick={() => {
                      setFaixasManuais(false)
                      setForm((prev) =>
                        prev ? { ...prev, faixasHorizontais: faixasSugeridasPreview } : prev
                      )
                    }}
                  >
                    Usar sugestão ({faixasSugeridasPreview})
                  </button>
                </p>
              </div>
            </div>
          )}
          {validacaoPreview && !validacaoPreview.ok ? (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              <p className="mb-1 fw-semibold">Área útil insuficiente para os componentes</p>
              <ul className="mb-0 small ps-3">
                {validacaoPreview.alertas.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {layoutPreview ? (
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <h3 className="h6 mb-0">Vista frontal da placa</h3>
              {canEditar && data.itens_considerados.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setDisposicao(
                      sugerirDisposicaoComponentes(layoutPreview, data.itens_considerados)
                    )
                    setDisposicaoDirty(true)
                  }}
                >
                  Sugerir disposição automática
                </button>
              ) : null}
            </div>
            <p className="text-muted small mb-3">
              Canaletas superior e inferior percorrem toda a largura da placa; as verticais ficam
              entre elas. Trilhos DIN entre faixas horizontais. Disjuntor geral ou caixa moldada de
              seccionamento no canto superior esquerdo; bornes na última fileira (esquerda → direita,
              alimentação primeiro, maior bitola). Arraste componentes ou canaletas intermediárias
              para ajustar.
            </p>
            {disposicaoIncompleta ? (
              <div className="alert alert-warning py-2 small mb-3" role="status">
                A disposição automática não conseguiu encaixar todos os componentes neste conjunto
                de painel e canaletas ({disposicao.length} de {instanciasEsperadas}). Escolha um
                painel maior, aumente as faixas úteis ou revise o modelo de canaleta.
              </div>
            ) : null}
            <PlacaCanaletasDiagram
              layout={layoutPreview}
              disposicao={disposicao}
              itensConsiderados={data.itens_considerados}
              editavel={canEditar}
              onDisposicaoChange={(itens) => {
                setDisposicao(itens)
                setDisposicaoDirty(true)
              }}
              onLayoutChange={onLayoutPlacaChange}
            />
            {!validacaoDisposicao.ok ? (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                <p className="mb-1 fw-semibold">Conflito na disposição dos componentes</p>
                <p className="small mb-2">
                  Nenhum componente pode sobrepor canaletas ou outros componentes. Itens em
                  conflito aparecem em vermelho no diagrama — ajuste a posição, aumente faixas
                  horizontais ou escolha um painel maior.
                </p>
                <ul className="mb-0 small ps-3">
                  {validacaoDisposicao.alertas.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {disposicaoDirty ? (
              <p className="text-warning small mb-0 mt-2">
                Disposição alterada — use &quot;Salvar escolhas&quot; para persistir.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {data.paineis_sugeridos.length > 0 ? (
        <div className="mb-4">
          <h3 className="h6 mb-2">Painéis comerciais sugeridos (catálogo)</h3>
          <div className="table-responsive app-data-table">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  {canEditar ? <th style={{ width: '3rem' }}>Escolha</th> : null}
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Placa útil (mm)</th>
                  <th>Profundidade</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.paineis_sugeridos.map((p) => {
                  const selecionado = form.painelProdutoId === p.produto_id
                  return (
                    <tr
                      key={p.produto_id}
                      className={selecionado ? 'table-primary' : undefined}
                    >
                      {canEditar ? (
                        <td>
                          <input
                            type="radio"
                            name="painel-escolhido"
                            className="form-check-input"
                            checked={selecionado}
                            aria-label={`Selecionar ${p.produto_codigo}`}
                            onChange={() => onSelecionarPainel(p.produto_id)}
                          />
                        </td>
                      ) : null}
                      <td>
                        <strong>{p.produto_codigo}</strong>
                      </td>
                      <td>{p.produto_descricao}</td>
                      <td>
                        {p.placa_largura_util_mm} × {p.placa_altura_util_mm}
                      </td>
                      <td>{p.profundidade_mm ?? '—'}</td>
                      <td>{p.grau_protecao_ip || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning" role="status">
          Nenhum painel do catálogo atende às dimensões mínimas calculadas. Cadastre modelos em PAINEL
          com placa útil ≥ {data.largura_placa_min_mm} × {data.altura_placa_min_mm} mm.
        </div>
      )}

      {data.itens_considerados.length > 0 ? (
        <div className="mb-4">
          <h3 className="h6 mb-2">Componentes considerados ({data.itens_considerados.length})</h3>
          <div className="table-responsive app-data-table">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Fabricante</th>
                  <th>Código</th>
                  <th>Qtd</th>
                  <th>Montagem</th>
                  <th>Dimensões (mm)</th>
                  <th>Área (mm²)</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {data.itens_considerados.map((item) => (
                  <tr key={item.composicao_item_id}>
                    <td>{item.fabricante?.trim() || '—'}</td>
                    <td>{item.produto_codigo}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.modo_montagem ?? '—'}</td>
                    <td>
                      {item.largura_mm} × {item.altura_mm}
                      {item.profundidade_mm ? ` × ${item.profundidade_mm}` : ''}
                    </td>
                    <td>{item.area_frontal_mm2}</td>
                    <td>
                      {item.reserva_mecanica ? (
                        <span className="badge text-bg-secondary">Reserva estimada</span>
                      ) : item.origem_item === 'sugestao' ? (
                        <span className="badge text-bg-info">Sugestão</span>
                      ) : item.origem_item === 'inclusao_manual' ? (
                        <span className="badge text-bg-primary">Manual catálogo</span>
                      ) : (
                        'Composição'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {data.itens_sem_dimensao.length > 0 ? (
        <div className="alert alert-warning mb-4" role="status">
          <strong>{data.itens_sem_dimensao.length} item(ns) sem dimensões no catálogo</strong> — não
          entraram na soma de área. Preencha largura/altura no cadastro do produto.
          <ul className="mb-0 mt-2 small">
            {data.itens_sem_dimensao.map((item) => (
              <li key={item.composicao_item_id}>
                {item.produto_codigo} — {item.produto_descricao}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="small text-muted">
        <summary className="mb-2">Memória de cálculo</summary>
        <pre className="mb-0 text-wrap" style={{ whiteSpace: 'pre-wrap' }}>
          {data.memoria_calculo}
        </pre>
      </details>
    </div>
  )
}
