import type {
  ComponenteDisposicaoItem,
  DimensionamentoMecanicoItem,
} from '../types/dimensionamento'
import type { LayoutPlaca, TrilhoDinLayoutItem } from './layoutPlaca'
import { gerarTrilhosDinLayout, TRILHO_DIN_ALTURA_PERFIL_MM } from './layoutPlaca'

export const GAP_COMPONENTES_MM = 4
/** Folga padrão entre a canaleta vertical esquerda e o primeiro componente no trilho. */
export const FOLGA_LATERAL_ESQUERDA_MM = 10

export type RectMm = {
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
}

export type InstanciaComponente = {
  instancia_id: string
  composicao_item_id: string
  produto_codigo: string
  produto_descricao: string
  modo_montagem: string
  categoria_produto: string
  parte_painel: string
  secao_max_mm2: number
  eh_borne_alimentacao: boolean
  largura_mm: number
  altura_mm: number
}

function parsePositiveInt(value: string | number | undefined, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback
}

export function expandirInstanciasComponentes(
  itens: DimensionamentoMecanicoItem[]
): InstanciaComponente[] {
  const instancias: InstanciaComponente[] = []
  for (const item of itens) {
    const largura = parsePositiveInt(item.largura_mm)
    const altura = parsePositiveInt(item.altura_mm)
    if (largura <= 0 || altura <= 0) continue
    const qtd = Math.max(1, Math.floor(Number(item.quantidade) || 1))
    for (let i = 0; i < qtd; i += 1) {
      instancias.push({
        instancia_id: `${item.composicao_item_id}#${i}`,
        composicao_item_id: item.composicao_item_id,
        produto_codigo: item.produto_codigo,
        produto_descricao: item.produto_descricao,
        modo_montagem: item.modo_montagem ?? '',
        categoria_produto: item.categoria_produto ?? '',
        parte_painel: item.parte_painel ?? '',
        secao_max_mm2: Number(item.secao_max_mm2) || 0,
        eh_borne_alimentacao: Boolean(item.eh_borne_alimentacao),
        largura_mm: largura,
        altura_mm: altura,
      })
    }
  }
  return instancias
}

export function rectsSobrepoem(a: RectMm, b: RectMm, margem = 0): boolean {
  return (
    a.x_mm < b.x_mm + b.largura_mm + margem &&
    a.x_mm + a.largura_mm + margem > b.x_mm &&
    a.y_mm < b.y_mm + b.altura_mm + margem &&
    a.y_mm + a.altura_mm + margem > b.y_mm
  )
}

export function rectSobrepoeCanaletas(rect: RectMm, layout: LayoutPlaca): boolean {
  const canaletas = [...layout.canaletas_verticais, ...layout.canaletas_horizontais]
  return canaletas.some((c) =>
    rectsSobrepoem(rect, {
      x_mm: c.x_mm,
      y_mm: c.y_mm,
      largura_mm: c.largura_mm,
      altura_mm: c.altura_mm,
    })
  )
}

export function obterTrilhosLayout(layout: LayoutPlaca): TrilhoDinLayoutItem[] {
  return (
    layout.trilhos_din ??
    gerarTrilhosDinLayout(
      layout.canaletas_horizontais,
      layout.zona_componentes.x_mm,
      layout.comprimento_canaleta_horizontal_mm,
      layout.trilho_din_altura_perfil_mm ?? TRILHO_DIN_ALTURA_PERFIL_MM
    )
  )
}

export function centroYTrilho(trilho: TrilhoDinLayoutItem): number {
  return trilho.y_mm + trilho.altura_mm / 2
}

/** Espaço vertical livre entre canaletas horizontais que delimitam o trilho. */
export function obterFaixaVerticalLivreTrilho(
  trilho: TrilhoDinLayoutItem,
  layout: LayoutPlaca
): { yMinMm: number; yMaxMm: number } {
  const horizontais = [...layout.canaletas_horizontais].sort((a, b) => a.y_mm - b.y_mm)
  const yTopoTrilho = trilho.y_mm
  const yBaseTrilho = trilho.y_mm + trilho.altura_mm

  let yMinMm = 0
  for (const canaleta of horizontais) {
    const baseCanaleta = canaleta.y_mm + canaleta.altura_mm
    if (baseCanaleta <= yTopoTrilho + 0.5) {
      yMinMm = Math.max(yMinMm, baseCanaleta)
    }
  }

  let yMaxMm = layout.placa_altura_mm
  for (const canaleta of horizontais) {
    if (canaleta.y_mm >= yBaseTrilho - 0.5) {
      yMaxMm = Math.min(yMaxMm, canaleta.y_mm)
      break
    }
  }

  return { yMinMm, yMaxMm }
}

export function posicaoCentralizadaNoTrilho(
  trilho: TrilhoDinLayoutItem,
  larguraMm: number,
  alturaMm: number,
  layout?: LayoutPlaca
): { x_mm: number; y_mm: number } {
  const x_mm = Math.round(trilho.x_mm + (trilho.largura_mm - larguraMm) / 2)
  let y_mm = Math.round(centroYTrilho(trilho) - alturaMm / 2)

  if (layout) {
    const { yMinMm, yMaxMm } = obterFaixaVerticalLivreTrilho(trilho, layout)
    const yMaxComponente = yMaxMm - alturaMm
    y_mm = Math.round(clamp(y_mm, yMinMm, Math.max(yMinMm, yMaxComponente)))
  }

  return { x_mm, y_mm }
}

export function trilhoMaisProximo(
  trilhos: TrilhoDinLayoutItem[],
  centroYMm: number
): { trilho: TrilhoDinLayoutItem; indice: number } | null {
  if (!trilhos.length) return null
  let melhor = 0
  let menorDist = Math.abs(centroYTrilho(trilhos[0]) - centroYMm)
  for (let i = 1; i < trilhos.length; i += 1) {
    const dist = Math.abs(centroYTrilho(trilhos[i]) - centroYMm)
    if (dist < menorDist) {
      menorDist = dist
      melhor = i
    }
  }
  return { trilho: trilhos[melhor], indice: melhor }
}

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor))
}

export function clampXNoTrilho(
  trilho: TrilhoDinLayoutItem,
  xMm: number,
  larguraMm: number
): number {
  const min = trilho.x_mm + FOLGA_LATERAL_ESQUERDA_MM
  const max = trilho.x_mm + trilho.largura_mm - larguraMm
  return Math.round(clamp(xMm, min, Math.max(min, max)))
}

function xInicialSequencialEsquerda(trilho: TrilhoDinLayoutItem): number {
  return trilho.x_mm + FOLGA_LATERAL_ESQUERDA_MM
}

function posicaoValida(
  item: ComponenteDisposicaoItem,
  layout: LayoutPlaca,
  outros: ComponenteDisposicaoItem[]
): boolean {
  const rect: RectMm = {
    x_mm: item.x_mm,
    y_mm: item.y_mm,
    largura_mm: item.largura_mm,
    altura_mm: item.altura_mm,
  }
  if (rect.x_mm < 0 || rect.y_mm < 0) return false
  if (rect.x_mm + rect.largura_mm > layout.placa_largura_mm) return false
  if (rect.y_mm + rect.altura_mm > layout.placa_altura_mm) return false
  if (rectSobrepoeCanaletas(rect, layout)) return false
  return !outros.some(
    (outro) =>
      outro.instancia_id !== item.instancia_id &&
      rectsSobrepoem(rect, {
        x_mm: outro.x_mm,
        y_mm: outro.y_mm,
        largura_mm: outro.largura_mm,
        altura_mm: outro.altura_mm,
      })
  )
}

function montarCandidatoTrilho(
  inst: InstanciaComponente,
  trilhoIndice: number | null,
  xMm: number,
  yMm: number
): ComponenteDisposicaoItem {
  return {
    instancia_id: inst.instancia_id,
    composicao_item_id: inst.composicao_item_id,
    produto_codigo: inst.produto_codigo,
    produto_descricao: inst.produto_descricao,
    modo_montagem: inst.modo_montagem,
    x_mm: xMm,
    y_mm: yMm,
    largura_mm: inst.largura_mm,
    altura_mm: inst.altura_mm,
    trilho_indice: trilhoIndice,
    manual: false,
  }
}

function buscarPosicaoValidaNoTrilho(
  trilho: TrilhoDinLayoutItem,
  trilhoIndice: number,
  inst: InstanciaComponente,
  layout: LayoutPlaca,
  jaPosicionados: ComponenteDisposicaoItem[],
  xPreferido: number,
  passoMm = 1
): ComponenteDisposicaoItem | null {
  const base = posicaoCentralizadaNoTrilho(trilho, inst.largura_mm, inst.altura_mm, layout)
  const xMin = trilho.x_mm + FOLGA_LATERAL_ESQUERDA_MM
  const xMax = trilho.x_mm + trilho.largura_mm - inst.largura_mm
  if (xMax < xMin) return null
  const xInicio = Math.max(xMin, Math.min(Math.round(xPreferido), xMax))

  for (let x = xInicio; x <= xMax; x += passoMm) {
    const candidato = montarCandidatoTrilho(inst, trilhoIndice, x, base.y_mm)
    if (posicaoValida(candidato, layout, jaPosicionados)) return candidato
  }
  for (let x = xMin; x < xInicio; x += passoMm) {
    const candidato = montarCandidatoTrilho(inst, trilhoIndice, x, base.y_mm)
    if (posicaoValida(candidato, layout, jaPosicionados)) return candidato
  }
  return null
}

function buscarPosicaoValidaNaFaixa(
  inst: InstanciaComponente,
  faixa: FaixaHorizontalLivre,
  layout: LayoutPlaca,
  jaPosicionados: ComponenteDisposicaoItem[],
  yPreferido: number,
  passoMm = 1
): ComponenteDisposicaoItem | null {
  const x = Math.round(faixa.xMm + (faixa.larguraMm - inst.largura_mm) / 2)
  const yMin = faixa.yInicioMm
  const yMax = faixa.yFimMm - inst.altura_mm
  if (yMax < yMin) return null
  const yInicio = Math.max(yMin, Math.min(Math.round(yPreferido), yMax))

  for (let y = yInicio; y <= yMax; y += passoMm) {
    const candidato = montarCandidatoTrilho(inst, null, x, y)
    if (posicaoValida(candidato, layout, jaPosicionados)) return candidato
  }
  for (let y = yMin; y < yInicio; y += passoMm) {
    const candidato = montarCandidatoTrilho(inst, null, x, y)
    if (posicaoValida(candidato, layout, jaPosicionados)) return candidato
  }
  return null
}

function posicionarInstanciaFaltante(
  inst: InstanciaComponente,
  layout: LayoutPlaca,
  jaPosicionados: ComponenteDisposicaoItem[]
): ComponenteDisposicaoItem | null {
  const trilhos = obterTrilhosLayout(layout)
  if (inst.modo_montagem === 'TRILHO_DIN') {
    for (let idx = 0; idx < trilhos.length; idx += 1) {
      const candidato = buscarPosicaoValidaNoTrilho(
        trilhos[idx],
        idx,
        inst,
        layout,
        jaPosicionados,
        xInicialSequencialEsquerda(trilhos[idx])
      )
      if (candidato !== null) return candidato
    }
    return null
  }

  const faixas = listarFaixasHorizontaisLivres(layout)
  for (const faixa of ordenarFaixasParaItemPlaca(inst, faixas)) {
    const yPreferido = Math.round(faixa.yInicioMm + (faixa.alturaLivreMm - inst.altura_mm) / 2)
    const candidato = buscarPosicaoValidaNaFaixa(
      inst,
      faixa,
      layout,
      jaPosicionados,
      yPreferido
    )
    if (candidato !== null) return candidato
  }
  return null
}

function completarDisposicaoFaltante(
  instancias: InstanciaComponente[],
  layout: LayoutPlaca,
  parcial: ComponenteDisposicaoItem[]
): ComponenteDisposicaoItem[] {
  const resultado = [...parcial]
  const colocados = new Set(resultado.map((item) => item.instancia_id))
  for (const inst of instancias) {
    if (colocados.has(inst.instancia_id)) continue
    const candidato = posicionarInstanciaFaltante(inst, layout, resultado)
    if (candidato !== null) {
      resultado.push(candidato)
      colocados.add(inst.instancia_id)
    }
  }
  return resultado
}

function ehBorne(inst: InstanciaComponente): boolean {
  return inst.categoria_produto === 'BORNE'
}

function ehDisjuntor(inst: InstanciaComponente): boolean {
  return [
    'DISJUNTOR',
    'DISJUNTOR_MOTOR',
    'DISJUNTOR_CAIXA_MOLDADA',
    'MINIDISJUNTOR',
  ].includes(inst.categoria_produto)
}

function ehContatora(inst: InstanciaComponente): boolean {
  return ['CONTATOR', 'CONTATORA'].includes(inst.categoria_produto)
}

/** Disjuntor geral ou seccionamento — canto superior esquerdo no trilho DIN. */
export function ehDisjuntorSuperiorEsquerda(inst: InstanciaComponente): boolean {
  if (inst.modo_montagem !== 'TRILHO_DIN') return false
  if (
    inst.categoria_produto !== 'DISJUNTOR_CAIXA_MOLDADA' &&
    inst.categoria_produto !== 'MINIDISJUNTOR'
  ) {
    return false
  }
  return inst.parte_painel === 'PROTECAO_GERAL' || inst.parte_painel === 'SECCIONAMENTO'
}

function indiceTrilhoSuperior(trilhos: TrilhoDinLayoutItem[]): number | null {
  if (!trilhos.length) return null
  let melhor = 0
  for (let i = 1; i < trilhos.length; i += 1) {
    if (centroYTrilho(trilhos[i]) < centroYTrilho(trilhos[melhor])) melhor = i
  }
  return melhor
}

function indiceTrilhoInferior(trilhos: TrilhoDinLayoutItem[]): number | null {
  if (!trilhos.length) return null
  let melhor = 0
  for (let i = 1; i < trilhos.length; i += 1) {
    if (centroYTrilho(trilhos[i]) > centroYTrilho(trilhos[melhor])) melhor = i
  }
  return melhor
}

function ordenarBornes(insts: InstanciaComponente[]): InstanciaComponente[] {
  return [...insts].sort((a, b) => {
    if (a.eh_borne_alimentacao !== b.eh_borne_alimentacao) {
      return a.eh_borne_alimentacao ? -1 : 1
    }
    if (b.secao_max_mm2 !== a.secao_max_mm2) return b.secao_max_mm2 - a.secao_max_mm2
    return a.produto_codigo.localeCompare(b.produto_codigo)
  })
}

function ordenarDisjuntoresSuperiores(insts: InstanciaComponente[]): InstanciaComponente[] {
  const pesoParte = (parte: string) => {
    if (parte === 'SECCIONAMENTO') return 0
    if (parte === 'PROTECAO_GERAL') return 1
    return 2
  }
  return [...insts].sort(
    (a, b) =>
      pesoParte(a.parte_painel) - pesoParte(b.parte_painel) ||
      a.produto_codigo.localeCompare(b.produto_codigo)
  )
}

function distribuirSequencialEsquerdaNoTrilho(
  trilho: TrilhoDinLayoutItem,
  trilhoIndice: number,
  instancias: InstanciaComponente[],
  layout: LayoutPlaca,
  jaPosicionados: ComponenteDisposicaoItem[],
  gapMm = GAP_COMPONENTES_MM,
  xInicial?: number
): ComponenteDisposicaoItem[] {
  if (!instancias.length) return []
  let x = xInicial ?? xInicialSequencialEsquerda(trilho)
  const posicionados: ComponenteDisposicaoItem[] = []
  for (const inst of instancias) {
    const contexto = [...jaPosicionados, ...posicionados]
    const candidato = buscarPosicaoValidaNoTrilho(
      trilho,
      trilhoIndice,
      inst,
      layout,
      contexto,
      x
    )
    if (candidato === null) continue
    posicionados.push(candidato)
    x = candidato.x_mm + inst.largura_mm + gapMm
  }
  return posicionados
}

function distribuirBornesNoTrilho(
  trilho: TrilhoDinLayoutItem,
  trilhoIndice: number,
  instancias: InstanciaComponente[],
  layout: LayoutPlaca,
  jaPosicionados: ComponenteDisposicaoItem[]
): ComponenteDisposicaoItem[] {
  return distribuirSequencialEsquerdaNoTrilho(
    trilho,
    trilhoIndice,
    ordenarBornes(instancias),
    layout,
    jaPosicionados,
    0
  )
}

function larguraTotalGrupoTrilho(instancias: InstanciaComponente[], gapMm = GAP_COMPONENTES_MM) {
  return (
    instancias.reduce((acc, inst) => acc + inst.largura_mm, 0) +
    gapMm * Math.max(0, instancias.length - 1)
  )
}

function grupoCabeNoTrilho(
  trilho: TrilhoDinLayoutItem,
  instancias: InstanciaComponente[],
  xInicial?: number,
  gapMm = GAP_COMPONENTES_MM
): boolean {
  if (!instancias.length) return true
  const x = xInicial ?? xInicialSequencialEsquerda(trilho)
  return x + larguraTotalGrupoTrilho(instancias, gapMm) <= trilho.x_mm + trilho.largura_mm
}

function ordenarDisjuntoresAgrupados(insts: InstanciaComponente[]): InstanciaComponente[] {
  return [...insts].sort(
    (a, b) =>
      a.produto_codigo.localeCompare(b.produto_codigo) ||
      a.instancia_id.localeCompare(b.instancia_id)
  )
}

function ordenarContatorasAgrupadas(insts: InstanciaComponente[]): InstanciaComponente[] {
  return [...insts].sort(
    (a, b) =>
      a.produto_codigo.localeCompare(b.produto_codigo) ||
      a.instancia_id.localeCompare(b.instancia_id)
  )
}

function distribuirGrupoPreferindoMesmoTrilho(
  trilhos: TrilhoDinLayoutItem[],
  indicesPreferencia: number[],
  instancias: InstanciaComponente[],
  layout: LayoutPlaca,
  resultado: ComponenteDisposicaoItem[],
  indiceMinimo = 0,
  xInicial?: number
): { posicionados: ComponenteDisposicaoItem[]; posicaoIndice: number } {
  if (!instancias.length) return { posicionados: [], posicaoIndice: indiceMinimo }

  for (let pos = indiceMinimo; pos < indicesPreferencia.length; pos += 1) {
    const indice = indicesPreferencia[pos]
    const trilho = trilhos[indice]
    const xGrupo = pos === indiceMinimo ? xInicial : undefined
    if (!grupoCabeNoTrilho(trilho, instancias, xGrupo)) continue
    const posicionados = distribuirSequencialEsquerdaNoTrilho(
      trilho,
      indice,
      instancias,
      layout,
      resultado,
      GAP_COMPONENTES_MM,
      xGrupo
    )
    if (posicionados.length === instancias.length) {
      return { posicionados, posicaoIndice: pos }
    }
  }

  const posicionados: ComponenteDisposicaoItem[] = []
  let restantes = [...instancias]
  let ultimaPosicao = indiceMinimo
  for (let pos = indiceMinimo; pos < indicesPreferencia.length; pos += 1) {
    if (!restantes.length) break
    const indice = indicesPreferencia[pos]
    const parciais = distribuirSequencialEsquerdaNoTrilho(
      trilhos[indice],
      indice,
      restantes,
      layout,
      [...resultado, ...posicionados],
      GAP_COMPONENTES_MM,
      pos === indiceMinimo ? xInicial : undefined
    )
    if (!parciais.length) continue
    const ids = new Set(parciais.map((item) => item.instancia_id))
    posicionados.push(...parciais)
    restantes = restantes.filter((inst) => !ids.has(inst.instancia_id))
    ultimaPosicao = pos
  }
  return { posicionados, posicaoIndice: ultimaPosicao }
}

export type FaixaHorizontalLivre = {
  indice: number
  yInicioMm: number
  yFimMm: number
  alturaLivreMm: number
  xMm: number
  larguraMm: number
}

export function listarFaixasHorizontaisLivres(layout: LayoutPlaca): FaixaHorizontalLivre[] {
  const horizontais = [...layout.canaletas_horizontais].sort((a, b) => a.y_mm - b.y_mm)
  const zona = layout.zona_componentes
  const faixas: FaixaHorizontalLivre[] = []

  for (let indice = 0; indice < horizontais.length - 1; indice += 1) {
    const superior = horizontais[indice]
    const inferior = horizontais[indice + 1]
    const yInicioMm = superior.y_mm + superior.altura_mm
    const yFimMm = inferior.y_mm
    if (yFimMm <= yInicioMm) continue
    faixas.push({
      indice,
      yInicioMm,
      yFimMm,
      alturaLivreMm: yFimMm - yInicioMm,
      xMm: zona.x_mm,
      larguraMm: zona.largura_mm,
    })
  }

  return faixas
}

function ordenarFaixasParaItemPlaca(
  inst: InstanciaComponente,
  faixas: FaixaHorizontalLivre[]
): FaixaHorizontalLivre[] {
  const cabem = faixas.filter(
    (faixa) => faixa.alturaLivreMm >= inst.altura_mm && faixa.larguraMm >= inst.largura_mm
  )
  const base = cabem.length
    ? cabem
    : [...faixas].sort((a, b) => b.alturaLivreMm - a.alturaLivreMm)
  return [...base].sort((a, b) => b.indice - a.indice)
}

export function ajustarLayoutPlacaParaItens(
  layout: LayoutPlaca,
  _itens: DimensionamentoMecanicoItem[]
): LayoutPlaca {
  // Mantém trilhos DIN; recorte visual em segmentarTrilhosDinComDisposicao.
  return layout
}

export const RECORTE_TRILHO_PLACA_MARGEM_MM = 10

type RecorteTrilhoXMm = { xInicio: number; xFim: number }

type ComponenteRecorteTrilho = {
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
  modo_montagem: string
}

function mergeRecortesTrilhoX(recortes: RecorteTrilhoXMm[]): RecorteTrilhoXMm[] {
  if (!recortes.length) return []
  const ordenados = [...recortes].sort((a, b) => a.xInicio - b.xInicio)
  const merged: RecorteTrilhoXMm[] = [ordenados[0]]
  for (let i = 1; i < ordenados.length; i += 1) {
    const cur = ordenados[i]
    const last = merged[merged.length - 1]
    if (cur.xInicio <= last.xFim) {
      last.xFim = Math.max(last.xFim, cur.xFim)
    } else {
      merged.push(cur)
    }
  }
  return merged
}

function rectsSobrepoemVerticalmente(
  trilho: Pick<TrilhoDinLayoutItem, 'y_mm' | 'altura_mm'>,
  comp: Pick<ComponenteRecorteTrilho, 'y_mm' | 'altura_mm'>
): boolean {
  const tTopo = trilho.y_mm
  const tBase = trilho.y_mm + trilho.altura_mm
  const cTopo = comp.y_mm
  const cBase = comp.y_mm + comp.altura_mm
  return !(cBase <= tTopo || cTopo >= tBase)
}

export function recortesTrilhoPorComponentesPlaca(
  trilho: TrilhoDinLayoutItem,
  componentes: ComponenteRecorteTrilho[]
): RecorteTrilhoXMm[] {
  const recortes = componentes
    .filter((c) => c.modo_montagem !== 'TRILHO_DIN')
    .filter((c) => rectsSobrepoemVerticalmente(trilho, c))
    .map((c) => ({
      xInicio: c.x_mm - RECORTE_TRILHO_PLACA_MARGEM_MM,
      xFim: c.x_mm + c.largura_mm + RECORTE_TRILHO_PLACA_MARGEM_MM,
    }))
  return mergeRecortesTrilhoX(recortes)
}

export function segmentarTrilhoDin(
  trilho: TrilhoDinLayoutItem,
  recortes: RecorteTrilhoXMm[]
): TrilhoDinLayoutItem[] {
  const xMin = trilho.x_mm
  const xMax = trilho.x_mm + trilho.largura_mm
  const recortesEfetivos = mergeRecortesTrilhoX(
    recortes
      .map((r) => ({
        xInicio: Math.max(xMin, r.xInicio),
        xFim: Math.min(xMax, r.xFim),
      }))
      .filter((r) => r.xFim > r.xInicio)
  )
  if (!recortesEfetivos.length) return [trilho]

  const segmentos: TrilhoDinLayoutItem[] = []
  let cursor = xMin
  for (const recorte of recortesEfetivos) {
    if (recorte.xInicio > cursor) {
      const largura = recorte.xInicio - cursor
      segmentos.push({
        ...trilho,
        x_mm: cursor,
        largura_mm: largura,
        comprimento_mm: largura,
      })
    }
    cursor = Math.max(cursor, recorte.xFim)
  }
  if (cursor < xMax) {
    const largura = xMax - cursor
    segmentos.push({
      ...trilho,
      x_mm: cursor,
      largura_mm: largura,
      comprimento_mm: largura,
    })
  }
  return segmentos
}

export function segmentarTrilhosDinComDisposicao(
  trilhos: TrilhoDinLayoutItem[],
  disposicao: ComponenteRecorteTrilho[]
): TrilhoDinLayoutItem[] {
  return trilhos.flatMap((trilho) =>
    segmentarTrilhoDin(trilho, recortesTrilhoPorComponentesPlaca(trilho, disposicao))
  )
}

function posicionarItensPlaca(
  placaItens: InstanciaComponente[],
  layout: LayoutPlaca,
  jaPosicionados: ComponenteDisposicaoItem[]
): ComponenteDisposicaoItem[] {
  if (!placaItens.length) return []

  const faixas = listarFaixasHorizontaisLivres(layout)
  const resultado: ComponenteDisposicaoItem[] = []

  for (const inst of placaItens) {
    for (const faixa of ordenarFaixasParaItemPlaca(inst, faixas)) {
      const yPreferido = Math.round(faixa.yInicioMm + (faixa.alturaLivreMm - inst.altura_mm) / 2)
      const candidato = buscarPosicaoValidaNaFaixa(
        inst,
        faixa,
        layout,
        [...jaPosicionados, ...resultado],
        yPreferido
      )
      if (candidato !== null) {
        resultado.push(candidato)
        break
      }
    }
  }

  return resultado
}

export function rotuloComponenteCurto(codigo: string, max = 7): string {
  const t = codigo.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export type EscopoComponenteDisposicao = {
  carga_tag?: string | null
  carga_descricao?: string | null
  parte_painel?: string | null
  parte_painel_display?: string | null
  categoria_produto?: string | null
}

export function criarMapaEscopoPorComposicaoItem(
  itens: DimensionamentoMecanicoItem[]
): Map<string, EscopoComponenteDisposicao> {
  return new Map(
    itens.map((item) => [
      item.composicao_item_id,
      {
        carga_tag: item.carga_tag,
        carga_descricao: item.carga_descricao,
        parte_painel: item.parte_painel,
        parte_painel_display: item.parte_painel_display,
        categoria_produto: item.categoria_produto,
      },
    ])
  )
}

/** Texto do tooltip ao passar o mouse sobre o componente no diagrama. */
export function montarTooltipComponenteDisposicao(
  comp: Pick<ComponenteDisposicaoItem, 'produto_codigo' | 'produto_descricao'>,
  escopo?: EscopoComponenteDisposicao | null
): string {
  const codigo = comp.produto_codigo?.trim() || '—'
  const descricao = comp.produto_descricao?.trim()
  const linha1 = descricao ? `${descricao} (${codigo})` : codigo

  let pertence = ''
  if (escopo?.carga_descricao?.trim()) {
    pertence = escopo.carga_descricao.trim()
  } else if (escopo?.carga_tag?.trim()) {
    pertence = escopo.carga_tag.trim()
  } else if (escopo?.parte_painel === 'PROTECAO_GERAL') {
    pertence = 'Proteção geral'
  } else if (escopo?.parte_painel === 'SECCIONAMENTO') {
    pertence = 'Seccionamento'
  } else if (escopo?.parte_painel_display?.trim()) {
    pertence = escopo.parte_painel_display.trim()
  }

  return pertence ? `${linha1}\n${pertence}` : linha1
}

export function sugerirDisposicaoComponentes(
  layout: LayoutPlaca,
  itens: DimensionamentoMecanicoItem[]
): ComponenteDisposicaoItem[] {
  const layoutAjustado = ajustarLayoutPlacaParaItens(layout, itens)
  const instancias = expandirInstanciasComponentes(itens)
  const trilhos = obterTrilhosLayout(layoutAjustado)
  const idxInferior = indiceTrilhoInferior(trilhos)
  const idxSuperior = indiceTrilhoSuperior(trilhos)
  const trilhoUnico = idxInferior !== null && idxSuperior === idxInferior

  const bornes = instancias.filter((i) => ehBorne(i) && i.modo_montagem === 'TRILHO_DIN')
  const trilhoItens = instancias.filter(
    (i) => i.modo_montagem === 'TRILHO_DIN' && !ehBorne(i)
  )
  const disjuntoresSuperiores = trilhoItens.filter(ehDisjuntorSuperiorEsquerda)
  const restoTrilho = trilhoItens.filter((i) => !ehDisjuntorSuperiorEsquerda(i))
  const disjuntores = ordenarDisjuntoresAgrupados(restoTrilho.filter(ehDisjuntor))
  const contatoras = ordenarContatorasAgrupadas(restoTrilho.filter(ehContatora))
  const outrosTrilho = restoTrilho.filter((i) => !ehDisjuntor(i) && !ehContatora(i))
  const placaItens = instancias.filter((i) => i.modo_montagem !== 'TRILHO_DIN')

  const resultado: ComponenteDisposicaoItem[] = []

  if (trilhoUnico && idxSuperior !== null) {
    const listaNaoBornes = [
      ...ordenarDisjuntoresSuperiores(disjuntoresSuperiores),
      ...disjuntores,
      ...contatoras,
      ...outrosTrilho,
    ]
    if (listaNaoBornes.length > 0) {
      resultado.push(
        ...distribuirSequencialEsquerdaNoTrilho(
          trilhos[idxSuperior],
          idxSuperior,
          listaNaoBornes,
          layoutAjustado,
          resultado
        )
      )
    }
    if (bornes.length > 0) {
      const ultimo = resultado.at(-1)
      const xBornes = ultimo
        ? ultimo.x_mm + ultimo.largura_mm + GAP_COMPONENTES_MM
        : undefined
      resultado.push(
        ...distribuirSequencialEsquerdaNoTrilho(
          trilhos[idxSuperior],
          idxSuperior,
          ordenarBornes(bornes),
          layoutAjustado,
          resultado,
          0,
          xBornes
        )
      )
    }
  } else {
    const indicesSuperiores = trilhos
      .map((_, idx) => idx)
      .filter((idx) => idx !== idxInferior)
      .sort((a, b) => centroYTrilho(trilhos[a]) - centroYTrilho(trilhos[b]))
    let posCorrente = 0

    if (idxSuperior !== null) {
      const listaSuperior = [...ordenarDisjuntoresSuperiores(disjuntoresSuperiores)]
      if (listaSuperior.length > 0) {
        resultado.push(
          ...distribuirSequencialEsquerdaNoTrilho(
            trilhos[idxSuperior],
            idxSuperior,
            listaSuperior,
            layoutAjustado,
            resultado
          )
        )
      }
    }

    const ultimo = resultado.at(-1)
    const xAposSuperiores =
      ultimo && ultimo.trilho_indice === idxSuperior
        ? ultimo.x_mm + ultimo.largura_mm + GAP_COMPONENTES_MM
        : undefined

    const disjResultado = distribuirGrupoPreferindoMesmoTrilho(
      trilhos,
      indicesSuperiores,
      disjuntores,
      layoutAjustado,
      resultado,
      posCorrente,
      xAposSuperiores
    )
    resultado.push(...disjResultado.posicionados)
    if (disjResultado.posicionados.length > 0) {
      posCorrente =
        disjResultado.posicaoIndice + 1 < indicesSuperiores.length
          ? disjResultado.posicaoIndice + 1
          : disjResultado.posicaoIndice
    }

    const contatoraResultado = distribuirGrupoPreferindoMesmoTrilho(
      trilhos,
      indicesSuperiores,
      contatoras,
      layoutAjustado,
      resultado,
      posCorrente
    )
    resultado.push(...contatoraResultado.posicionados)
    if (contatoraResultado.posicionados.length > 0) {
      posCorrente =
        contatoraResultado.posicaoIndice + 1 < indicesSuperiores.length
          ? contatoraResultado.posicaoIndice + 1
          : contatoraResultado.posicaoIndice
    }

    for (const inst of outrosTrilho) {
      if (!indicesSuperiores.length) break
      const indiceMenor = indicesSuperiores.reduce((melhor, idx) => {
        const larguraIdx = resultado
          .filter((item) => item.trilho_indice === idx)
          .reduce((acc, item) => acc + item.largura_mm, 0)
        const larguraMelhor = resultado
          .filter((item) => item.trilho_indice === melhor)
          .reduce((acc, item) => acc + item.largura_mm, 0)
        return larguraIdx < larguraMelhor ? idx : melhor
      }, indicesSuperiores[0])
      resultado.push(
        ...distribuirSequencialEsquerdaNoTrilho(
          trilhos[indiceMenor],
          indiceMenor,
          [inst],
          layoutAjustado,
          resultado
        )
      )
    }

    if (idxInferior !== null && bornes.length > 0) {
      resultado.push(
        ...distribuirBornesNoTrilho(
          trilhos[idxInferior],
          idxInferior,
          bornes,
          layoutAjustado,
          resultado
        )
      )
    }
  }

  resultado.push(...posicionarItensPlaca(placaItens, layoutAjustado, resultado))

  return completarDisposicaoFaltante(instancias, layoutAjustado, resultado)
}

export function ajustarPosicaoArraste(
  item: ComponenteDisposicaoItem,
  novoX: number,
  novoY: number,
  layout: LayoutPlaca,
  outros: ComponenteDisposicaoItem[]
): ComponenteDisposicaoItem | null {
  const trilhos = obterTrilhosLayout(layout)
  const centroY = novoY + item.altura_mm / 2
  const proximo = trilhoMaisProximo(trilhos, centroY)

  let candidato: ComponenteDisposicaoItem = { ...item, manual: true }

  if (item.modo_montagem === 'TRILHO_DIN' && proximo) {
    const base = posicaoCentralizadaNoTrilho(
      proximo.trilho,
      item.largura_mm,
      item.altura_mm,
      layout
    )
    candidato = {
      ...candidato,
      x_mm: clampXNoTrilho(proximo.trilho, novoX, item.largura_mm),
      y_mm: base.y_mm,
      trilho_indice: proximo.indice,
    }
  } else {
    const zona = layout.zona_componentes
    candidato = {
      ...candidato,
      x_mm: Math.round(
        clamp(novoX, zona.x_mm, zona.x_mm + zona.largura_mm - item.largura_mm)
      ),
      y_mm: Math.round(
        clamp(novoY, zona.y_mm, zona.y_mm + zona.altura_mm - item.altura_mm)
      ),
      trilho_indice: null,
    }
  }

  if (!posicaoValida(candidato, layout, outros)) return null
  return candidato
}

export function mesclarDisposicaoSalva(
  salva: ComponenteDisposicaoItem[] | undefined,
  layout: LayoutPlaca,
  itens: DimensionamentoMecanicoItem[]
): ComponenteDisposicaoItem[] {
  const layoutAjustado = ajustarLayoutPlacaParaItens(layout, itens)
  const sugerida = sugerirDisposicaoComponentes(layout, itens)
  if (!salva?.length) return sugerida

  const instancias = expandirInstanciasComponentes(itens)
  const mapaInstancias = new Map(instancias.map((inst) => [inst.instancia_id, inst]))
  const instanciasAtuais = new Set(instancias.map((i) => i.instancia_id))
  const mapaSugerida = new Map(sugerida.map((item) => [item.instancia_id, item]))
  const resultado: ComponenteDisposicaoItem[] = []

  for (const instId of instanciasAtuais) {
    const manual = salva.find((s) => s.instancia_id === instId && s.manual)
    let fallback = mapaSugerida.get(instId)
    if (!fallback) {
      const inst = mapaInstancias.get(instId)
      if (inst) {
        fallback = posicionarInstanciaFaltante(inst, layoutAjustado, resultado) ?? undefined
      }
    }
    if (!fallback) continue

    if (manual) {
      const ajustado = ajustarPosicaoArraste(
        { ...manual, manual: true },
        manual.x_mm,
        manual.y_mm,
        layoutAjustado,
        resultado
      )
      resultado.push(ajustado ?? fallback)
    } else {
      const salvoAuto = salva.find((s) => s.instancia_id === instId)
      if (salvoAuto) {
        const ajustado = ajustarPosicaoArraste(
          { ...salvoAuto, manual: false },
          salvoAuto.x_mm,
          salvoAuto.y_mm,
          layoutAjustado,
          resultado
        )
        resultado.push(ajustado ?? fallback)
      } else {
        resultado.push(fallback)
      }
    }
  }

  return completarDisposicaoFaltante(instancias, layoutAjustado, resultado)
}

export function disposicaoTemSobreposicao(
  disposicao: ComponenteDisposicaoItem[],
  layout: LayoutPlaca
): boolean {
  return validarDisposicaoComponentes(disposicao, layout).length > 0
}

function rectComponente(item: ComponenteDisposicaoItem): RectMm {
  return {
    x_mm: item.x_mm,
    y_mm: item.y_mm,
    largura_mm: item.largura_mm,
    altura_mm: item.altura_mm,
  }
}

/** Mensagens de conflito (canaletas ou sobreposição entre componentes). */
export function validarDisposicaoComponentes(
  disposicao: ComponenteDisposicaoItem[],
  layout: LayoutPlaca
): string[] {
  const erros: string[] = []

  for (const item of disposicao) {
    const rect = rectComponente(item)
    const codigo = item.produto_codigo || item.instancia_id

    if (rectSobrepoeCanaletas(rect, layout)) {
      erros.push(`Componente ${codigo} sobrepõe canaleta.`)
      continue
    }

    for (const outro of disposicao) {
      if (outro.instancia_id === item.instancia_id) continue
      if (rectsSobrepoem(rect, rectComponente(outro))) {
        erros.push(
          `Componentes ${codigo} e ${outro.produto_codigo || outro.instancia_id} estão sobrepostos.`
        )
        break
      }
    }
  }

  return erros
}

export function idsComponentesComConflitoDisposicao(
  disposicao: ComponenteDisposicaoItem[],
  layout: LayoutPlaca
): Set<string> {
  const ids = new Set<string>()

  for (const item of disposicao) {
    const rect = rectComponente(item)
    if (rectSobrepoeCanaletas(rect, layout)) {
      ids.add(item.instancia_id)
      continue
    }
    for (const outro of disposicao) {
      if (outro.instancia_id === item.instancia_id) continue
      if (rectsSobrepoem(rect, rectComponente(outro))) {
        ids.add(item.instancia_id)
        ids.add(outro.instancia_id)
      }
    }
  }

  return ids
}
