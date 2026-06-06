import type { ReactNode } from 'react'

type Props = Readonly<{
  isPanel: boolean
  title: string
  children: ReactNode
}>

/** Envolve campos técnicos por tipo (card no drawer ou fragmento na página). */
export function CargaFormParametrosShell({ isPanel, title, children }: Props) {
  if (!isPanel) {
    return <>{children}</>
  }

  return (
    <section className="carga-form-panel__card carga-form-panel__parametros">
      <h3 className="carga-form-panel__title">{title}</h3>
      <div className="row g-2 carga-form-panel__param-grid">{children}</div>
    </section>
  )
}
