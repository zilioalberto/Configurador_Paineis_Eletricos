import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import type { ResumoDimensionamento } from '@/modules/configurador_paineis/dimensionamento/types/dimensionamento'
import type { ComposicaoItem, SugestaoItem } from '../types/composicao'
import type { GrupoItensPorTag } from '../utils/composicaoDisplay'
import { LinhaSeparadoraGrupoPorTag } from './composicaoTableComponents'
import { ComposicaoLinhaEscopo } from './ComposicaoLinhaEscopo'

const COLUNAS_ESCOPO = [
  'Tag',
  'Descrição',
  'Tipo',
  'Potência',
  'Corrente',
  'Tensão (carga)',
  'Fases (carga)',
  'Papel / função',
  'Qtd.',
  'Categoria',
  'Produto',
  'Código',
  'Status',
] as const

function CabecalhoTabelaEscopo({ comAcoes }: Readonly<{ comAcoes: boolean }>) {
  return (
    <thead>
      <tr>
        {COLUNAS_ESCOPO.map((h) => (
          <th key={h}>{h}</th>
        ))}
        {comAcoes ? <th className="text-end">Ações</th> : null}
      </tr>
    </thead>
  )
}

/** Tabela de itens aprovados agrupados por tag de carga. */
export function ComposicaoTabelaAprovada({
  grupos,
  vazio,
  podeEditar,
  dimensionamento,
  projeto,
  reabrirPending,
  onReabrir,
}: Readonly<{
  grupos: GrupoItensPorTag<ComposicaoItem>[]
  vazio: boolean
  podeEditar: boolean
  dimensionamento: ResumoDimensionamento | undefined
  projeto: Projeto | undefined
  reabrirPending: boolean
  onReabrir: (item: ComposicaoItem) => void
}>) {
  if (vazio) {
    return (
      <p className="text-muted small mb-0">
        Nenhum item aprovado ainda. Use &quot;Aprovar&quot; nas sugestões.
      </p>
    )
  }
  const colSpan = podeEditar ? 14 : 13
  return (
    <div className="table-responsive app-data-table">
      <table className="table table-sm table-hover align-middle">
        <CabecalhoTabelaEscopo comAcoes={podeEditar} />
        {grupos.map((grupo) => (
          <tbody key={grupo.chave}>
            <LinhaSeparadoraGrupoPorTag
              colSpan={colSpan}
              tituloTag={grupo.tituloTag}
              carga={grupo.carga}
            />
            {grupo.itens.map((c) => (
              <ComposicaoLinhaEscopo
                key={c.id}
                item={c}
                dimensionamento={dimensionamento}
                projeto={projeto}
                statusLabel={c.status_display ?? 'Aprovado'}
                acoes={
                  podeEditar ? (
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning"
                        disabled={reabrirPending}
                        onClick={() => onReabrir(c)}
                      >
                        Reabrir
                      </button>
                    </td>
                  ) : undefined
                }
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

/** Tabela de sugestões pendentes de aprovação, agrupadas por tag. */
export function ComposicaoTabelaSugestoes({
  grupos,
  vazio,
  podeEditar,
  dimensionamento,
  projeto,
  aprovarPending,
  aprovandoTodas,
  onAprovar,
  onAlterar,
}: Readonly<{
  grupos: GrupoItensPorTag<SugestaoItem>[]
  vazio: boolean
  podeEditar: boolean
  dimensionamento: ResumoDimensionamento | undefined
  projeto: Projeto | undefined
  aprovarPending: boolean
  aprovandoTodas: boolean
  onAprovar: (id: string) => void
  onAlterar: (s: SugestaoItem) => void
}>) {
  if (vazio) {
    return (
      <p className="text-muted small mb-0">
        Nenhuma sugestão ainda. As sugestões são geradas automaticamente após cadastrar cargas e
        dimensionar o projeto.
      </p>
    )
  }
  const colSpan = podeEditar ? 14 : 13
  const busy = aprovarPending || aprovandoTodas
  return (
    <div className="table-responsive app-data-table">
      <table className="table table-sm table-hover align-middle">
        <CabecalhoTabelaEscopo comAcoes={podeEditar} />
        {grupos.map((grupo) => (
          <tbody key={grupo.chave}>
            <LinhaSeparadoraGrupoPorTag
              colSpan={colSpan}
              tituloTag={grupo.tituloTag}
              carga={grupo.carga}
            />
            {grupo.itens.map((s) => (
              <ComposicaoLinhaEscopo
                key={s.id}
                item={s}
                dimensionamento={dimensionamento}
                projeto={projeto}
                statusLabel={s.status_display ?? s.status}
                acoes={
                  podeEditar ? (
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-success me-1"
                        disabled={busy}
                        onClick={() => onAprovar(s.id)}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        disabled={busy}
                        onClick={() => onAlterar(s)}
                      >
                        Alterar
                      </button>
                    </td>
                  ) : undefined
                }
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}
