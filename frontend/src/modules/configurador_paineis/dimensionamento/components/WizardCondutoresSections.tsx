/** Subcomponentes do wizard: toolbar, tabela de circuitos e alimentação geral. */

import type {
  AlimentacaoGeralCondutores,
  CircuitoCargaCondutores,
  TabelaReferenciaCondutor,
} from '../types/dimensionamento'
import {
  buildOverridesCircuito,
  opcoesBitolaAlimentacaoGeral,
  opcoesBitolaFase,
  opcoesBitolaNeutro,
  opcoesBitolaPe,
  opcoesBitolaPeAlimentacaoGeral,
  parseNum,
  SUGESTAO_CONDUTOR,
  type OverridesAg,
  type OverridesCircuito,
} from '../utils/wizardCondutoresUtils'

type CircuitoActions = {
  onRevisar: (c: CircuitoCargaCondutores) => void
  onUsarSugestao: (c: CircuitoCargaCondutores) => void
  onAprovar: (c: CircuitoCargaCondutores) => void
}

type PanelSlice = {
  canEditar: boolean
  patchPending: boolean
  bloquearEdicao: boolean
}

const LEGENDA_CORRENTE_REFERENCIA_CIRCUITO =
  'Corrente de projeto do circuito (corrente unitária × quantidade). Não inclui fator de demanda.'

function CabecalhoCorrenteReferenciaCircuito() {
  return (
    <th scope="col">
      <abbr title={LEGENDA_CORRENTE_REFERENCIA_CIRCUITO} className="text-decoration-none">
        I ref (A)
      </abbr>
      <div className="small text-muted fw-normal lh-sm mt-1">sem FD</div>
    </th>
  )
}

export function WizardCondutoresToolbar({
  embedded,
  podeAprovarTodas,
  patchPending,
  canEditar,
  onAprovarTodas,
}: {
  embedded: boolean
  podeAprovarTodas: boolean
  patchPending: boolean
  canEditar: boolean
  onAprovarTodas: () => void
}) {
  const toolbarIntro = embedded ? null : (
    <>
      <h2 className="h5 mb-1">Condutores (revisão)</h2>
      <p className="small text-muted mb-0">
        Ajuste as bitolas (Iz mínimo, tabela B1 simplificada). <strong>Aprovar</strong> move o circuito
        para a tabela de aprovados; <strong>Revisar</strong> devolve às sugestões.{' '}
        <strong>Aprovar todas</strong> confirma a revisão completa do projeto.
      </p>
      <p className="small text-muted mb-0 mt-1">
        A coluna <strong>I ref</strong> usa corrente unitária × quantidade por carga —{' '}
        <strong>sem fator de demanda</strong> (FD só no seccionamento de entrada em painel distribuição).
      </p>
    </>
  )

  return (
    <div
      className={`d-flex flex-wrap justify-content-between align-items-start gap-3 ${embedded ? 'mb-4' : 'mb-3'}`}
    >
      <div>{toolbarIntro}</div>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {podeAprovarTodas ? (
          <button
            type="button"
            className={`btn ${embedded ? 'btn-success' : 'btn-sm btn-success'}`}
            disabled={patchPending || !canEditar}
            onClick={onAprovarTodas}
          >
            {patchPending ? 'Aprovando…' : 'Aprovar todas'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function CircuitosAprovadosTable({
  lista,
  canEditar,
  patchPending,
  onRevisar,
}: PanelSlice & { lista: CircuitoCargaCondutores[]; onRevisar: (c: CircuitoCargaCondutores) => void }) {
  if (lista.length === 0) {
    return <p className="text-muted small mb-3">Nenhum circuito aprovado ainda.</p>
  }
  return (
    <div className="table-responsive mb-4 app-data-table">
      <table className="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th>Tag</th>
            <CabecalhoCorrenteReferenciaCircuito />
            <th>Fase (efetiva)</th>
            <th>Neutro</th>
            <th>PE</th>
            {canEditar ? <th className="text-end">Ações</th> : null}
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => (
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
                    disabled={patchPending}
                    onClick={() => onRevisar(c)}
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
  )
}

function CircuitoPendenteRow({
  c,
  tabela,
  ov,
  setO,
  panel,
  actions,
}: {
  c: CircuitoCargaCondutores
  tabela: TabelaReferenciaCondutor[]
  ov: OverridesCircuito
  setO: (patch: Partial<OverridesCircuito>) => void
  panel: PanelSlice
  actions: CircuitoActions
}) {
  const opF = opcoesBitolaFase(tabela, c)
  const opN = opcoesBitolaNeutro(tabela, c)
  const opP = opcoesBitolaPe(tabela)
  const { canEditar, patchPending, bloquearEdicao } = panel

  return (
    <tr>
      <td>
        <strong>{c.carga_tag}</strong>
        <div className="small text-muted">{c.classificacao_circuito}</div>
      </td>
      <td>{c.corrente_referencia_a ?? '—'}</td>
      <td>
        <select
          className="form-select form-select-sm"
          disabled={!canEditar || patchPending || bloquearEdicao}
          value={ov.fase}
          onChange={(e) => setO({ fase: e.target.value })}
        >
          <option value={SUGESTAO_CONDUTOR}>
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
            disabled={!canEditar || patchPending || bloquearEdicao}
            value={ov.neutro}
            onChange={(e) => setO({ neutro: e.target.value })}
          >
            <option value={SUGESTAO_CONDUTOR}>
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
            disabled={!canEditar || patchPending || bloquearEdicao}
            value={ov.pe}
            onChange={(e) => setO({ pe: e.target.value })}
          >
            <option value={SUGESTAO_CONDUTOR}>
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
              disabled={patchPending || bloquearEdicao}
              onClick={() => actions.onUsarSugestao(c)}
              title="Limpa escolhas e usa apenas o dimensionamento"
            >
              Usar sugestão
            </button>
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={patchPending || bloquearEdicao}
              onClick={() => actions.onAprovar(c)}
            >
              Aprovar
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  )
}

export function CircuitosPendentesTable({
  lista,
  tabela,
  circuitoOv,
  setCircuitoOv,
  panel,
  actions,
  revisaoEfetivaOk,
}: {
  lista: CircuitoCargaCondutores[]
  tabela: TabelaReferenciaCondutor[]
  circuitoOv: Record<string, OverridesCircuito>
  setCircuitoOv: React.Dispatch<React.SetStateAction<Record<string, OverridesCircuito>>>
  panel: PanelSlice
  actions: CircuitoActions
  revisaoEfetivaOk: boolean
}) {
  const { canEditar } = panel
  if (lista.length === 0) {
    return (
      <p className="text-muted small mb-4">
        Nenhuma sugestão pendente{revisaoEfetivaOk ? ' (revisão confirmada).' : '.'}
      </p>
    )
  }
  return (
    <div className="table-responsive mb-4 app-data-table">
      <table className="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th>Tag</th>
            <CabecalhoCorrenteReferenciaCircuito />
            <th>Fase</th>
            <th>Neutro</th>
            <th>PE</th>
            {canEditar ? <th className="text-end">Ações</th> : null}
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => {
            const ov = circuitoOv[c.id] ?? buildOverridesCircuito(c)
            const setO = (patch: Partial<OverridesCircuito>) => {
              setCircuitoOv((prev) => ({ ...prev, [c.id]: { ...ov, ...patch } }))
            }
            return (
              <CircuitoPendenteRow
                key={c.id}
                c={c}
                tabela={tabela}
                ov={ov}
                setO={setO}
                panel={panel}
                actions={actions}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function WizardCondutoresCircuitosBlock({
  circuitos,
  aprovados,
  pendentes,
  tabela,
  circuitoOv,
  setCircuitoOv,
  panel,
  actions,
  revisaoEfetivaOk,
}: {
  circuitos: CircuitoCargaCondutores[]
  aprovados: CircuitoCargaCondutores[]
  pendentes: CircuitoCargaCondutores[]
  tabela: TabelaReferenciaCondutor[]
  circuitoOv: Record<string, OverridesCircuito>
  setCircuitoOv: React.Dispatch<React.SetStateAction<Record<string, OverridesCircuito>>>
  panel: PanelSlice
  actions: CircuitoActions
  revisaoEfetivaOk: boolean
}) {
  if (circuitos.length === 0) {
    return (
      <p className="text-muted small mb-0">
        Nenhum circuito de carga dimensionado (sem cargas ativas?).
      </p>
    )
  }
  return (
    <>
      <h2 className="h5 mb-3">Condutores aprovados</h2>
      <CircuitosAprovadosTable
        lista={aprovados}
        canEditar={panel.canEditar}
        patchPending={panel.patchPending}
        bloquearEdicao={panel.bloquearEdicao}
        onRevisar={actions.onRevisar}
      />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="h5 mb-0">Sugestões (pendentes)</h2>
      </div>
      <CircuitosPendentesTable
        lista={pendentes}
        tabela={tabela}
        circuitoOv={circuitoOv}
        setCircuitoOv={setCircuitoOv}
        panel={panel}
        actions={actions}
        revisaoEfetivaOk={revisaoEfetivaOk}
      />
    </>
  )
}

function rotuloFasePainel(indice: number, totalFases: number): string {
  if (totalFases === 1) return 'Fase 1'
  return `L${indice + 1}`
}

type CorrentesPorFasePainelSectionProps = Readonly<{
  correntes: string[] | undefined
  correnteTotalReferencia: string
  aplicaFatorDemandaSeccionamento?: boolean
}>

export function CorrentesPorFasePainelSection({
  correntes,
  correnteTotalReferencia,
  aplicaFatorDemandaSeccionamento = false,
}: CorrentesPorFasePainelSectionProps) {
  if (!correntes?.length) return null

  const maxFase = Math.max(...correntes.map((c) => parseNum(c)))
  const legendaReferencia = aplicaFatorDemandaSeccionamento
    ? '(fase mais carregada × fator de demanda — painel distribuição)'
    : '(fase mais carregada — fator de demanda não aplicado)'

  return (
    <div className="mb-4">
      <h2 className="h5 mb-2">Corrente por fase do painel</h2>
      <p className="text-muted small mb-3">
        Acúmulo das cargas ativas em cada fase. I total de referência para seccionamento de
        entrada: <strong>{correnteTotalReferencia} A</strong> {legendaReferencia}.
      </p>
      <div className="table-responsive app-data-table">
        <table className="table table-sm align-middle w-auto mb-0">
          <thead>
            <tr>
              <th>Fase</th>
              <th className="text-end">Corrente (A)</th>
            </tr>
          </thead>
          <tbody>
            {correntes.map((corrente, indice) => {
              const valor = parseNum(corrente)
              const referencia = valor === maxFase && maxFase > 0
              return (
                <tr key={rotuloFasePainel(indice, correntes.length)}>
                  <td>{rotuloFasePainel(indice, correntes.length)}</td>
                  <td className="text-end">
                    {corrente}
                    {referencia ? (
                      <span className="badge text-bg-secondary ms-2">referência</span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type AlimentacaoGeralSectionProps = {
  ag: AlimentacaoGeralCondutores
  agOv: OverridesAg
  setAgOv: React.Dispatch<React.SetStateAction<OverridesAg | null>>
  agAprovado: boolean
  tabela: TabelaReferenciaCondutor[]
  ibPainel: number
  panel: PanelSlice
  onRevisar: () => void
  onUsarSugestao: () => void
  onAprovar: () => void
}

function AlimentacaoGeralAprovada({
  ag,
  canEditar,
  patchPending,
  onRevisar,
}: Readonly<{
  ag: AlimentacaoGeralCondutores
  canEditar: boolean
  patchPending: boolean
  onRevisar: () => void
}>) {
  return (
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
                  disabled={patchPending}
                  onClick={onRevisar}
                >
                  Revisar
                </button>
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function AlimentacaoGeralSection({
  ag,
  agOv,
  setAgOv,
  agAprovado,
  tabela,
  ibPainel,
  panel,
  onRevisar,
  onUsarSugestao,
  onAprovar,
}: AlimentacaoGeralSectionProps) {
  const { canEditar, patchPending, bloquearEdicao } = panel

  return (
    <div className="mb-4">
      <h2 className="h5 mb-3">Alimentação geral do painel</h2>
      {agAprovado ? (
        <AlimentacaoGeralAprovada
          ag={ag}
          canEditar={canEditar}
          patchPending={patchPending}
          onRevisar={onRevisar}
        />
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
                    disabled={!canEditar || patchPending || bloquearEdicao}
                    value={agOv.fase}
                    onChange={(e) => setAgOv((prev) => (prev ? { ...prev, fase: e.target.value } : prev))}
                  >
                    <option value={SUGESTAO_CONDUTOR}>
                      Sugestão ({ag.secao_condutor_fase_mm2 ?? '—'} mm²)
                    </option>
                    {opcoesBitolaAlimentacaoGeral(tabela, ibPainel).map((s) => (
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
                      disabled={!canEditar || patchPending || bloquearEdicao}
                      value={agOv.neutro}
                      onChange={(e) =>
                        setAgOv((prev) => (prev ? { ...prev, neutro: e.target.value } : prev))
                      }
                    >
                      <option value={SUGESTAO_CONDUTOR}>
                        Sugestão ({ag.secao_condutor_neutro_mm2 ?? '—'} mm²)
                      </option>
                      {opcoesBitolaAlimentacaoGeral(tabela, ibPainel).map((s) => (
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
                      disabled={!canEditar || patchPending || bloquearEdicao}
                      value={agOv.pe}
                      onChange={(e) => setAgOv((prev) => (prev ? { ...prev, pe: e.target.value } : prev))}
                    >
                      <option value={SUGESTAO_CONDUTOR}>
                        Sugestão ({ag.secao_condutor_pe_mm2 ?? '—'} mm²)
                      </option>
                      {opcoesBitolaPeAlimentacaoGeral(tabela).map((s) => (
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
                        disabled={patchPending || bloquearEdicao}
                        onClick={onUsarSugestao}
                      >
                        Usar sugestão
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={patchPending || bloquearEdicao}
                        onClick={onAprovar}
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
  )
}
