import { Link, useSearchParams } from 'react-router-dom'
import type { ProjetoFluxoEtapaId } from '../hooks/useProjetoFluxoGates'
import { useProjetoFluxoGates } from '../hooks/useProjetoFluxoGates'
import {
  PROJETO_FLUXO_ETAPAS,
  projetoFluxoEtapaBloqueada,
  projetoFluxoHref,
  projetoFluxoTituloBloqueio,
} from '../utils/projetoFluxoNav'

type Props = {
  projetoId: string
  etapaAtual: ProjetoFluxoEtapaId
}

/** Etapas compactas do fluxo na barra azul superior. */
export function ProjetoFluxoHeaderSteps({ projetoId, etapaAtual }: Props) {
  const gates = useProjetoFluxoGates(projetoId)
  const [searchParams] = useSearchParams()
  const ordemAtual = PROJETO_FLUXO_ETAPAS.findIndex((e) => e.id === etapaAtual)

  return (
    <nav
      className="app-header-fluxo-steps"
      aria-label="Etapas do fluxo do painel"
    >
      <ol className="app-header-fluxo-steps__list list-unstyled mb-0">
        {PROJETO_FLUXO_ETAPAS.map((etapa, idx) => {
          const ativa = etapa.id === etapaAtual
          const concluida = ordemAtual > idx
          const lock = projetoFluxoEtapaBloqueada(etapa.id, gates)
          const titulo = projetoFluxoTituloBloqueio(etapa.id)
          const href = projetoFluxoHref(etapa.id, projetoId, searchParams)
          const classStep = [
            'app-header-fluxo-steps__item',
            ativa ? 'is-active' : '',
            concluida && !ativa ? 'is-done' : '',
            lock ? 'is-locked' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <li key={etapa.id} className={classStep}>
              {lock ? (
                <span
                  className="app-header-fluxo-steps__pill"
                  title={titulo}
                  aria-current={ativa ? 'step' : undefined}
                  aria-disabled
                >
                  {etapa.shortLabel}
                </span>
              ) : (
                <Link
                  to={href}
                  className="app-header-fluxo-steps__pill text-decoration-none"
                  aria-current={ativa ? 'step' : undefined}
                  title={etapa.label}
                >
                  {etapa.shortLabel}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
