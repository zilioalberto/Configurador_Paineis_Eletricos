import type { ReactNode } from 'react'

type Props = {
  projetoId: string
  projetoNome?: string | null
  temCargas: boolean
  children: ReactNode
}

/**
 * Shell enxuto para a etapa de dimensionamento dentro do fluxo do configurador.
 * O contexto e a navegação ficam na barra superior da aplicação.
 */
export function DimensionamentoWizardShell({
  children,
}: Props) {
  return <div className="mb-4">{children}</div>
}
