import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import type { ProjetoFluxoEtapaId } from '../hooks/useProjetoFluxoGates'
import { withFluxoOrigem } from './fluxoOrigem'

export type ProjetoFluxoGatesSnapshot = {
  podeAcessarDimensionamento: boolean
  podeAcessarComposicao: boolean
}

export const PROJETO_FLUXO_ETAPAS: {
  id: ProjetoFluxoEtapaId
  label: string
  shortLabel: string
}[] = [
  { id: 'cargas', label: '1. Cargas', shortLabel: 'Cargas' },
  { id: 'dimensionamento', label: '2. Dimensionamento', shortLabel: 'Dimensionamento' },
  { id: 'composicao', label: '3. Composição', shortLabel: 'Composição' },
]

export function projetoFluxoHref(
  etapa: ProjetoFluxoEtapaId,
  projetoId: string,
  searchParams?: URLSearchParams
): string {
  let href: string
  switch (etapa) {
    case 'cargas':
      href = configuradorPaths.cargas(projetoId)
      break
    case 'dimensionamento':
      href = configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento')
      break
    case 'composicao':
      href = configuradorPaths.composicao(projetoId)
      break
    default:
      href = configuradorPaths.cargas(projetoId)
      break
  }
  return searchParams ? withFluxoOrigem(href, searchParams) : href
}

export function projetoFluxoEtapaBloqueada(
  etapa: ProjetoFluxoEtapaId,
  gates: ProjetoFluxoGatesSnapshot
): boolean {
  if (etapa === 'cargas') return false
  if (etapa === 'dimensionamento') return !gates.podeAcessarDimensionamento
  if (etapa === 'composicao') return !gates.podeAcessarComposicao
  return true
}

export function projetoFluxoTituloBloqueio(etapa: ProjetoFluxoEtapaId): string | undefined {
  if (etapa === 'dimensionamento') return 'Cadastre ao menos uma carga antes desta etapa.'
  if (etapa === 'composicao') {
    return 'Conclua a revisão e aprovação das bitolas de condutores antes da composição.'
  }
  return undefined
}
