import type { ChangeEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'

type ProjetoOpcao = {
  id: string
  codigo: string
  nome: string
}

type ComposicaoSeletorProjetoProps = Readonly<{
  projetoId: string
  projetos: ProjetoOpcao[]
  loadingProjetos: boolean
  onProjetoChange: ChangeEventHandler<HTMLSelectElement>
  canViewCargas: boolean
  canViewDimensionamento: boolean
}>

/** Card de seleção de projeto exibido enquanto nenhum projeto está selecionado. */
export function ComposicaoSeletorProjeto({
  projetoId,
  projetos,
  loadingProjetos,
  onProjetoChange,
  canViewCargas,
  canViewDimensionamento,
}: ComposicaoSeletorProjetoProps) {
  if (projetoId) return null

  const linkCargas = canViewCargas ? (
    <Link to={configuradorPaths.cargas()}>cargas</Link>
  ) : (
    'cargas'
  )
  const linkDimensionamento = canViewDimensionamento ? (
    <Link to={configuradorPaths.dimensionamento()}>dimensionamento</Link>
  ) : (
    'dimensionamento'
  )

  return (
    <div className="card mb-3">
      <div className="card-body">
        <label className="form-label fw-semibold" htmlFor="comp-projeto">
          Projeto
        </label>
        <select
          id="comp-projeto"
          className="form-select"
          style={{ maxWidth: '28rem' }}
          value={projetoId}
          onChange={onProjetoChange}
          disabled={loadingProjetos}
        >
          <option value="">Selecione um projeto</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} — {p.nome}
            </option>
          ))}
        </select>
        <p className="small text-muted mt-2 mb-0">
          Antes de gerar, confira as {linkCargas} e o {linkDimensionamento} (corrente total de
          entrada).
        </p>
      </div>
    </div>
  )
}
