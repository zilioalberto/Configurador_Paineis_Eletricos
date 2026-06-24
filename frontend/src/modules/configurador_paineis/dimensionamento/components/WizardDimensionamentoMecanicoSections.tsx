/**
 * Seções de UI extraídas do `WizardDimensionamentoMecanicoPanel` para reduzir a
 * complexidade cognitiva do componente principal.
 */
import type { Dispatch, SetStateAction } from 'react'

import type {
  ComponenteDisposicaoItem,
  DimensionamentoMecanicoDetalhe,
  DimensionamentoMecanicoItem,
} from '../types/dimensionamento'
import type { LayoutPlaca } from '../utils/layoutPlaca'
import type { ValidacaoZonaUtil } from '../utils/zonaUtilComponentes'
import { sugerirDisposicaoComponentes } from '../utils/disposicaoComponentes'
import {
  alturaReferenciaCanaletas,
  type FormStateMecanico,
} from '../utils/wizardDimensionamentoMecanicoUtils'
import PlacaCanaletasDiagram from './PlacaCanaletasDiagram'

type FormState = FormStateMecanico
type SetForm = Dispatch<SetStateAction<FormState | null>>
type ValidacaoUi = Readonly<{ ok: boolean; alertas: string[] }>

export type ResumoCardsRowProps = Readonly<{
  data: DimensionamentoMecanicoDetalhe
  form: FormState
  setForm: SetForm
  canEditar: boolean
  validacaoPreview: ValidacaoZonaUtil | null
  faixasSugeridasPreview: number
}>

export function ResumoCardsRow({
  data,
  form,
  setForm,
  canEditar,
  validacaoPreview,
  faixasSugeridasPreview,
}: ResumoCardsRowProps) {
  return (
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
                          taxaOcupacaoMax: Math.min(100, Math.max(1, Number(e.target.value) || 80)),
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
                <> — zona: {validacaoPreview.area_minima_necessaria_mm2} mm² mín.</>
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
  )
}

export type CanaletasConfigCardProps = Readonly<{
  data: DimensionamentoMecanicoDetalhe
  form: FormState
  setForm: SetForm
  setFaixasManuais: Dispatch<SetStateAction<boolean>>
  canaletasCatalogo: DimensionamentoMecanicoDetalhe['canaletas_catalogo']
  canEditar: boolean
  faixasSugeridasPreview: number
  validacaoPreview: ValidacaoZonaUtil | null
  onSelecionarCanaleta: (produtoId: string) => void
}>

export function CanaletasConfigCard({
  form,
  setForm,
  setFaixasManuais,
  canaletasCatalogo,
  canEditar,
  faixasSugeridasPreview,
  validacaoPreview,
  onSelecionarCanaleta,
}: CanaletasConfigCardProps) {
  const canaletas = canaletasCatalogo ?? []
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h3 className="h6 mb-3">Configuração de canaletas</h3>
        {canaletas.length === 0 ? (
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
                {canaletas.map((c) => (
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
                      ? { ...prev, faixasHorizontais: Math.max(2, Number(e.target.value) || 2) }
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
  )
}

export type PlacaPreviewCardProps = Readonly<{
  layoutPreview: LayoutPlaca
  data: DimensionamentoMecanicoDetalhe
  disposicao: ComponenteDisposicaoItem[]
  setDisposicao: Dispatch<SetStateAction<ComponenteDisposicaoItem[]>>
  setDisposicaoDirty: Dispatch<SetStateAction<boolean>>
  canEditar: boolean
  disposicaoIncompleta: boolean
  instanciasEsperadas: number
  validacaoDisposicao: ValidacaoUi
  disposicaoDirty: boolean
  onLayoutPlacaChange: (layout: LayoutPlaca) => void
}>

export function PlacaPreviewCard({
  layoutPreview,
  data,
  disposicao,
  setDisposicao,
  setDisposicaoDirty,
  canEditar,
  disposicaoIncompleta,
  instanciasEsperadas,
  validacaoDisposicao,
  disposicaoDirty,
  onLayoutPlacaChange,
}: PlacaPreviewCardProps) {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <h3 className="h6 mb-0">Vista frontal da placa</h3>
          {canEditar && data.itens_considerados.length > 0 ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                setDisposicao(sugerirDisposicaoComponentes(layoutPreview, data.itens_considerados))
                setDisposicaoDirty(true)
              }}
            >
              Sugerir disposição automática
            </button>
          ) : null}
        </div>
        <p className="text-muted small mb-3">
          Canaletas superior e inferior percorrem toda a largura da placa; as verticais ficam entre
          elas. Trilhos DIN entre faixas horizontais. Disjuntor geral ou caixa moldada de
          seccionamento no canto superior esquerdo; bornes na última fileira (esquerda → direita,
          alimentação primeiro, maior bitola). Arraste componentes ou canaletas intermediárias para
          ajustar.
        </p>
        {disposicaoIncompleta ? (
          <div className="alert alert-warning py-2 small mb-3" role="status">
            A disposição automática não conseguiu encaixar todos os componentes neste conjunto de
            painel e canaletas ({disposicao.length} de {instanciasEsperadas}). Escolha um painel
            maior, aumente as faixas úteis ou revise o modelo de canaleta.
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
              Nenhum componente pode sobrepor canaletas ou outros componentes. Itens em conflito
              aparecem em vermelho no diagrama — ajuste a posição, aumente faixas horizontais ou
              escolha um painel maior.
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
  )
}

export type PaineisSugeridosTableProps = Readonly<{
  data: DimensionamentoMecanicoDetalhe
  form: FormState
  canEditar: boolean
  onSelecionarPainel: (produtoId: string) => void
}>

export function PaineisSugeridosTable({
  data,
  form,
  canEditar,
  onSelecionarPainel,
}: PaineisSugeridosTableProps) {
  if (data.paineis_sugeridos.length === 0) {
    return (
      <div className="alert alert-warning" role="status">
        Nenhum painel do catálogo atende às dimensões mínimas calculadas. Cadastre modelos em PAINEL
        com placa útil ≥ {data.largura_placa_min_mm} × {data.altura_placa_min_mm} mm.
      </div>
    )
  }
  return (
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
                <tr key={p.produto_id} className={selecionado ? 'table-primary' : undefined}>
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
  )
}

function OrigemItemBadge({ item }: Readonly<{ item: DimensionamentoMecanicoItem }>) {
  if (item.reserva_mecanica) {
    return <span className="badge text-bg-secondary">Reserva estimada</span>
  }
  if (item.origem_item === 'sugestao') {
    return <span className="badge text-bg-info">Sugestão</span>
  }
  if (item.origem_item === 'inclusao_manual') {
    return <span className="badge text-bg-primary">Manual catálogo</span>
  }
  return <>Composição</>
}

export type ItensConsideradosTableProps = Readonly<{
  itens: DimensionamentoMecanicoItem[]
}>

export function ItensConsideradosTable({ itens }: ItensConsideradosTableProps) {
  if (itens.length === 0) return null
  return (
    <div className="mb-4">
      <h3 className="h6 mb-2">Componentes considerados ({itens.length})</h3>
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
            {itens.map((item) => (
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
                  <OrigemItemBadge item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type ItensSemDimensaoAlertProps = Readonly<{
  itens: DimensionamentoMecanicoItem[]
}>

export function ItensSemDimensaoAlert({ itens }: ItensSemDimensaoAlertProps) {
  if (itens.length === 0) return null
  return (
    <div className="alert alert-warning mb-4" role="status">
      <strong>{itens.length} item(ns) sem dimensões no catálogo</strong> — não entraram na soma de
      área. Preencha largura/altura no cadastro do produto.
      <ul className="mb-0 mt-2 small">
        {itens.map((item) => (
          <li key={item.composicao_item_id}>
            {item.produto_codigo} — {item.produto_descricao}
          </li>
        ))}
      </ul>
    </div>
  )
}
