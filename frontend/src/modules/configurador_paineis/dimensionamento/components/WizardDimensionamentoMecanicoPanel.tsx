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
import {
  CanaletasConfigCard,
  ItensConsideradosTable,
  ItensSemDimensaoAlert,
  PaineisSugeridosTable,
  PlacaPreviewCard,
  ResumoCardsRow,
} from './WizardDimensionamentoMecanicoSections'

type Props = Readonly<{
  projetoId: string
  embedded?: boolean
}>

type FormState = FormStateMecanico

const formFromData = formFromDataMecanico

function canaletasDisponiveis(data: DimensionamentoMecanicoDetalhe | undefined) {
  if (data?.canaletas_catalogo) return data.canaletas_catalogo
  if (data?.canaleta) return [data.canaleta]
  if (data?.canaleta_escolhida) return [data.canaleta_escolhida]
  return []
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
      {embedded ? null : (
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
      )}

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

      <ResumoCardsRow
        data={data}
        form={form}
        setForm={setForm}
        canEditar={canEditar}
        validacaoPreview={validacaoPreview}
        faixasSugeridasPreview={faixasSugeridasPreview}
      />

      <CanaletasConfigCard
        data={data}
        form={form}
        setForm={setForm}
        setFaixasManuais={setFaixasManuais}
        canaletasCatalogo={canaletasCatalogo}
        canEditar={canEditar}
        faixasSugeridasPreview={faixasSugeridasPreview}
        validacaoPreview={validacaoPreview}
        onSelecionarCanaleta={onSelecionarCanaleta}
      />

      {layoutPreview ? (
        <PlacaPreviewCard
          layoutPreview={layoutPreview}
          data={data}
          disposicao={disposicao}
          setDisposicao={setDisposicao}
          setDisposicaoDirty={setDisposicaoDirty}
          canEditar={canEditar}
          disposicaoIncompleta={disposicaoIncompleta}
          instanciasEsperadas={instanciasEsperadas}
          validacaoDisposicao={validacaoDisposicao}
          disposicaoDirty={disposicaoDirty}
          onLayoutPlacaChange={onLayoutPlacaChange}
        />
      ) : null}

      <PaineisSugeridosTable
        data={data}
        form={form}
        canEditar={canEditar}
        onSelecionarPainel={onSelecionarPainel}
      />

      <ItensConsideradosTable itens={data.itens_considerados} />

      <ItensSemDimensaoAlert itens={data.itens_sem_dimensao} />

      <details className="small text-muted">
        <summary className="mb-2">Memória de cálculo</summary>
        <pre className="mb-0 text-wrap" style={{ whiteSpace: 'pre-wrap' }}>
          {data.memoria_calculo}
        </pre>
      </details>
    </div>
  )
}
