import { Link } from 'react-router-dom'
import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import type { ResumoDimensionamento } from '@/modules/configurador_paineis/dimensionamento/types/dimensionamento'
import { ProjetoIdentificacaoFluxo } from '@/modules/configurador_paineis/projetos/components/ProjetoIdentificacaoFluxo'
import type { ComposicaoItem, ComposicaoSnapshot, PendenciaItem, SugestaoItem } from '../types/composicao'
import {
  em,
  formatCorrenteCarga,
  formatNumeroFasesCarga,
  formatPotenciaCarga,
  formatPotenciaPainelEntradaKw,
  LEGENDA_DESCR_PAINEL_GERAL,
  LEGENDA_TAG_PAINEL_GERAL,
  LEGENDA_TIPO_PAINEL_GERAL,
  textoCorrenteEntradaPainel,
  textoDescricaoCarga,
  textoFasesAlimentacaoProjeto,
  textoPapelItem,
  textoTensaoAlimentacaoProjeto,
  type GrupoItensPorTag,
} from '../utils/composicaoDisplay'
import { CabecalhoGrupoCarga, CelulaTensaoCarga, LinhaSeparadoraGrupoPorTag } from './composicaoTableComponents'
import { ComposicaoTabelaAprovada, ComposicaoTabelaSugestoes } from './ComposicaoTabelasEscopo'
import { InclusaoManualCatalogoSection } from './InclusaoManualCatalogoSection'

type Props = {
  projetoId: string
  snapshot: ComposicaoSnapshot
  projetoSelecionado: Projeto | undefined
  dimensionamento: ResumoDimensionamento | undefined
  composicaoItens: ComposicaoItem[]
  gruposComposicaoAprovada: GrupoItensPorTag<ComposicaoItem>[]
  gruposSugestoes: GrupoItensPorTag<SugestaoItem>[]
  gruposPendencias: GrupoItensPorTag<PendenciaItem>[]
  gruposMemorialCalculos: GrupoItensPorTag<SugestaoItem>[]
  podeEditar: boolean
  canEditarCatalogo: boolean
  canSepararMaterial: boolean
  aprovarPending: boolean
  aprovandoTodas: boolean
  reabrirPending: boolean
  reavaliarPending: boolean
  onReabrir: (item: ComposicaoItem) => void
  onAprovar: (id: string) => void
  onAlterar: (s: SugestaoItem) => void
  onAprovarTodas: () => void
  onReavaliarPendencias: () => void
}

function ComposicaoTabelaPendencias({
  grupos,
  vazio,
  dimensionamento,
  projeto,
}: {
  grupos: GrupoItensPorTag<PendenciaItem>[]
  vazio: boolean
  dimensionamento: ResumoDimensionamento | undefined
  projeto: Projeto | undefined
}) {
  if (vazio) {
    return <p className="text-muted small mb-0">Nenhuma pendência aberta.</p>
  }
  return (
    <div className="table-responsive app-data-table">
      <table className="table table-sm table-hover align-middle">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Potência</th>
            <th>Corrente</th>
            <th>Tensão (carga)</th>
            <th>Fases (carga)</th>
            <th>Parte do painel</th>
            <th>Obs.</th>
            <th>Categoria</th>
            <th>Produto</th>
            <th>Código</th>
            <th>Detalhe</th>
            <th>Status</th>
          </tr>
        </thead>
        {grupos.map((grupo) => (
          <tbody key={grupo.chave}>
            <LinhaSeparadoraGrupoPorTag colSpan={14} tituloTag={grupo.tituloTag} carga={grupo.carga} />
            {grupo.itens.map((p) => (
              <tr key={p.id}>
                <td>{p.carga ? p.carga.tag : LEGENDA_TAG_PAINEL_GERAL}</td>
                <td>{p.carga ? textoDescricaoCarga(p.carga) : LEGENDA_DESCR_PAINEL_GERAL}</td>
                <td>
                  {p.carga ? (
                    <span className="badge text-bg-secondary">{em(p.carga.tipo_display)}</span>
                  ) : (
                    <span className="badge text-bg-secondary">{LEGENDA_TIPO_PAINEL_GERAL}</span>
                  )}
                </td>
                <td>
                  {p.carga
                    ? formatPotenciaCarga(p.carga)
                    : formatPotenciaPainelEntradaKw(
                        dimensionamento,
                        p.corrente_referencia_a,
                        p.projeto_alimentacao,
                        projeto
                      )}
                </td>
                <td>
                  {p.carga
                    ? formatCorrenteCarga(p.carga)
                    : textoCorrenteEntradaPainel(dimensionamento, p.corrente_referencia_a)}
                </td>
                {p.carga ? (
                  <CelulaTensaoCarga carga={p.carga} />
                ) : (
                  <td className="small">
                    {textoTensaoAlimentacaoProjeto(p.projeto_alimentacao, projeto)}
                  </td>
                )}
                <td>
                  {p.carga
                    ? formatNumeroFasesCarga(p.carga)
                    : textoFasesAlimentacaoProjeto(p.projeto_alimentacao, projeto)}
                </td>
                <td className="small">{p.parte_painel_display ?? p.parte_painel}</td>
                <td className="small">{em(textoPapelItem(p.observacoes))}</td>
                <td>
                  <span className="badge text-bg-secondary">
                    {p.categoria_produto_display ?? p.categoria_produto}
                  </span>
                </td>
                <td>—</td>
                <td>—</td>
                <td className="small">{p.descricao}</td>
                <td>{p.status_display ?? p.status}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

export function ComposicaoSnapshotContent({
  projetoId,
  snapshot,
  projetoSelecionado,
  dimensionamento,
  composicaoItens,
  gruposComposicaoAprovada,
  gruposSugestoes,
  gruposPendencias,
  gruposMemorialCalculos,
  podeEditar,
  canEditarCatalogo,
  canSepararMaterial,
  aprovarPending,
  aprovandoTodas,
  reabrirPending,
  reavaliarPending,
  onReabrir,
  onAprovar,
  onAlterar,
  onAprovarTodas,
  onReavaliarPendencias,
}: Props) {
  return (
    <div className="row g-4">
      <div className="col-12">
        <ProjetoIdentificacaoFluxo
          projetoCodigo={projetoSelecionado?.codigo ?? snapshot.projeto_codigo}
          projetoNome={projetoSelecionado?.nome ?? snapshot.projeto_nome}
          fallbackId={snapshot.projeto ?? projetoId}
          htmlId="composicao-projeto-identificacao"
        />
        <p className="small text-muted mb-0 mt-2">
          {snapshot.totais ? (
            <>
              {snapshot.totais.sugestoes} sugestão(ões) · {snapshot.totais.pendencias} pendência(s)
              {snapshot.totais.composicao_itens != null ? (
                <> · {snapshot.totais.composicao_itens} item(ns) na composição</>
              ) : null}
              {snapshot.totais.inclusoes_manuais != null ? (
                <> · {snapshot.totais.inclusoes_manuais} inclusão(ões) manual(is)</>
              ) : null}
            </>
          ) : (
            'Sem totais de composição.'
          )}
        </p>
        {snapshot.geracao?.erros_etapas && snapshot.geracao.erros_etapas.length > 0 ? (
          <div className="alert alert-warning mt-2 mb-0" role="status">
            <strong>Avisos na última geração:</strong>
            <ul className="mb-0 mt-1 small">
              {snapshot.geracao.erros_etapas.map((e, i) => (
                <li key={i}>
                  {e.etapa}: {e.erro}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="col-12">
        <h2 className="h5 mb-3">Composição aprovada</h2>
        <ComposicaoTabelaAprovada
          grupos={gruposComposicaoAprovada}
          vazio={composicaoItens.length === 0}
          podeEditar={podeEditar}
          dimensionamento={dimensionamento}
          projeto={projetoSelecionado}
          reabrirPending={reabrirPending}
          onReabrir={onReabrir}
        />
      </div>

      <div className="col-12">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h5 mb-0">Sugestões de itens</h2>
          {podeEditar && snapshot.sugestoes.length > 0 ? (
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={aprovarPending || aprovandoTodas}
              onClick={onAprovarTodas}
            >
              {aprovandoTodas ? 'Aprovando todas...' : 'Aprovar todas'}
            </button>
          ) : null}
        </div>
        <ComposicaoTabelaSugestoes
          grupos={gruposSugestoes}
          vazio={snapshot.sugestoes.length === 0}
          podeEditar={podeEditar}
          dimensionamento={dimensionamento}
          projeto={projetoSelecionado}
          aprovarPending={aprovarPending}
          aprovandoTodas={aprovandoTodas}
          onAprovar={onAprovar}
          onAlterar={onAlterar}
        />
      </div>

      <div className="col-12">
        <h2 className="h5 mb-3">Pendências (catálogo)</h2>
        <p className="small text-muted">
          Quando não há produto compatível no catálogo, uma pendência é registrada. Use as ações
          abaixo para cadastrar produtos e reexecutar as regras deste projeto.
        </p>
        <ComposicaoTabelaPendencias
          grupos={gruposPendencias}
          vazio={snapshot.pendencias.length === 0}
          dimensionamento={dimensionamento}
          projeto={projetoSelecionado}
        />
      </div>

      <div className="col-12">
        <div className="card border">
          <div className="card-body">
            <h3 className="h6 mb-2">Resolver pendências</h3>
            <p className="small text-muted mb-3">
              Cadastre no catálogo produtos compatíveis com a categoria e os parâmetros elétricos
              das pendências. Depois, reavalie para aplicar de novo as regras de composição; em
              seguida use &quot;Gerar sugestões&quot; no topo para atualizar as sugestões de itens
              do painel.
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {canEditarCatalogo ? (
                <Link
                  to={
                    projetoId
                      ? `/catalogo/novo?retorno=${encodeURIComponent(`/composicao?projeto=${projetoId}`)}`
                      : '/catalogo/novo'
                  }
                  className="btn btn-outline-primary"
                >
                  Cadastrar produto no catálogo
                </Link>
              ) : null}
              {canSepararMaterial ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!projetoId || !podeEditar || reavaliarPending}
                  onClick={onReavaliarPendencias}
                >
                  {reavaliarPending ? 'Reavaliando…' : 'Reavaliar pendências'}
                </button>
              ) : null}
            </div>
            {!podeEditar && projetoId ? (
              <p className="small text-muted mb-0 mt-2">
                Projeto finalizado: reavaliação de pendências não está disponível.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <InclusaoManualCatalogoSection
        projetoId={projetoId}
        podeEditar={podeEditar}
        inclusoes={snapshot.inclusoes_manuais ?? []}
      />

      <div className="col-12">
        <details className="card bg-light border-0">
          <summary className="card-body py-3" style={{ cursor: 'pointer' }}>
            <strong>Memorial de cálculos (sugestões)</strong>
          </summary>
          <div className="card-body pt-0">
            <p className="small text-muted mb-2">
              Detalhes técnicos registrados pelo motor de sugestões (backend).
            </p>
            {gruposMemorialCalculos.length === 0 ? (
              <p className="small mb-0 text-muted">Sem memorial de cálculo preenchido.</p>
            ) : (
              <div className="vstack gap-3 small">
                {gruposMemorialCalculos.map((grupo) => (
                  <div key={grupo.chave} className="border rounded overflow-hidden">
                    <CabecalhoGrupoCarga tituloTag={grupo.tituloTag} carga={grupo.carga} />
                    <ul className="list-unstyled mb-0 p-2 bg-white">
                      {grupo.itens.map((s) => (
                        <li key={s.id} className="mb-2">
                          <strong>{s.produto_codigo ?? s.produto?.codigo ?? '—'}</strong>
                          <pre className="mt-1 mb-0 p-2 bg-body-tertiary border rounded small overflow-auto">
                            {s.memoria_calculo}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}
