import { type ReactNode } from 'react'

import { useMediaQuery } from '@/hooks/useMediaQuery'

type Props = Readonly<{
  title: string
  children: ReactNode
}>

/** Parâmetros por tipo de carga: título fixo no desktop; bloco recolhível no mobile. */
export function CargaModeloTipoSection({ title, children }: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return (
      <>
        <div className="col-12">
          <h3 className="carga-form-panel__title mt-2">{title}</h3>
        </div>
        {children}
      </>
    )
  }

  return (
    <div className="col-12">
      <details className="carga-form-panel__details carga-modelos-tipo-details" open>
        <summary className="carga-form-panel__summary">{title}</summary>
        <div className="carga-form-panel__details-body">
          <div className="row g-3">{children}</div>
        </div>
      </details>
    </div>
  )
}
