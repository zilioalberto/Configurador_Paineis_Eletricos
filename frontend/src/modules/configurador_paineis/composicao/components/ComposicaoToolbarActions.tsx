/** Ações da toolbar da página de composição (navegação e exportações). */
import { Link } from 'react-router-dom'

import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'

type ComposicaoExportFormat = 'pdf' | 'xlsx'

export type ComposicaoToolbarActionsProps = Readonly<{
  projetoId: string
  composicaoAtualPath: string
  searchParams: URLSearchParams
  composicaoFinal: boolean
  podeAcessarDimensionamentoMecanico: boolean
  fluxoVinculadoOrcamento: boolean
  botaoExportarPropostaHabilitado: boolean
  motivoBloqueioRetornoOrcamento: string
  sincronizandoOrcamento: boolean
  exportando: ComposicaoExportFormat | null
  onRetornarOrcamento: () => Promise<void>
  onExportLista: (formato: ComposicaoExportFormat) => void
}>

export function ComposicaoToolbarActions({
  projetoId,
  composicaoAtualPath,
  searchParams,
  composicaoFinal,
  podeAcessarDimensionamentoMecanico,
  fluxoVinculadoOrcamento,
  botaoExportarPropostaHabilitado,
  motivoBloqueioRetornoOrcamento,
  sincronizandoOrcamento,
  exportando,
  onRetornarOrcamento,
  onExportLista,
}: ComposicaoToolbarActionsProps) {
  return (
    <>
      {projetoId ? (
        <>
          <Link
            to={`${configuradorPaths.configuracaoEditar(projetoId)}?retorno=${encodeURIComponent(
              withFluxoOrigem(composicaoAtualPath, searchParams)
            )}`}
            className="btn btn-outline-light btn-sm"
          >
            Editar configurações
          </Link>
          <Link
            to={withFluxoOrigem(configuradorPaths.cargas(projetoId), searchParams)}
            className="btn btn-outline-light btn-sm"
          >
            Editar cargas
          </Link>
          <Link
            to={withFluxoOrigem(
              configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento'),
              searchParams
            )}
            className="btn btn-outline-light btn-sm"
          >
            Editar condutores
          </Link>
          {podeAcessarDimensionamentoMecanico ? (
            <Link
              to={withFluxoOrigem(
                configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento_mecanico'),
                searchParams
              )}
              className="btn btn-success btn-sm"
            >
              {composicaoFinal ? 'Revisar mecânico' : 'Dimensionamento mecânico'}
            </Link>
          ) : null}
        </>
      ) : null}
      {fluxoVinculadoOrcamento ? (
        <button
          type="button"
          className="btn btn-success btn-sm"
          disabled={!botaoExportarPropostaHabilitado}
          title={!botaoExportarPropostaHabilitado ? motivoBloqueioRetornoOrcamento : undefined}
          onClick={() => onRetornarOrcamento().catch(() => undefined)}
        >
          {sincronizandoOrcamento ? 'Exportando…' : 'Exportar sugestões para proposta'}
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-outline-light btn-sm"
        disabled={!projetoId || exportando !== null}
        title="Lista completa do painel, incluindo composição final, inclusões manuais e pendências"
        onClick={() => onExportLista('xlsx')}
      >
        {exportando === 'xlsx' ? 'Excel…' : 'Excel'}
      </button>
      <button
        type="button"
        className="btn btn-outline-light btn-sm"
        disabled={!projetoId || exportando !== null}
        title="Lista completa do painel, incluindo composição final, inclusões manuais e pendências"
        onClick={() => onExportLista('pdf')}
      >
        {exportando === 'pdf' ? 'PDF…' : 'PDF'}
      </button>
    </>
  )
}
