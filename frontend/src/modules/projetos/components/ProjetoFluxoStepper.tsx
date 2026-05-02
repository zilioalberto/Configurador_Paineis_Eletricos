import { Fragment, useId } from 'react'
import { Link } from 'react-router-dom'
import type { ProjetoFluxoEtapaId } from '../hooks/useProjetoFluxoGates'
import { useProjetoFluxoGates } from '../hooks/useProjetoFluxoGates'

const ETAPAS: {
  id: ProjetoFluxoEtapaId
  label: string
  descricao: string
}[] = [
  { id: 'projeto', label: '1. Projeto', descricao: 'Dados do projeto' },
  { id: 'cargas', label: '2. Cargas do projeto', descricao: 'Cadastro de cargas' },
  { id: 'dimensionamento', label: '3. Dimensionamento', descricao: 'Condutores e revisão' },
  { id: 'composicao', label: '4. Composição do painel', descricao: 'Materiais e sugestões' },
]

type Props = {
  projetoId: string
  etapaAtual: ProjetoFluxoEtapaId
  /** Oculta texto longo em telas estreitas */
  compact?: boolean
}

/**
 * Barra de etapas do fluxo do painel — mesma ordem em todas as telas do projeto.
 */
export function ProjetoFluxoStepper({ projetoId, etapaAtual, compact = false }: Props) {
  const gates = useProjetoFluxoGates(projetoId)
  const hintId = useId()

  function hrefPara(etapa: ProjetoFluxoEtapaId): string {
    switch (etapa) {
      case 'projeto':
        return `/projetos/${projetoId}`
      case 'cargas':
        return `/cargas?projeto=${encodeURIComponent(projetoId)}`
      case 'dimensionamento':
        return `/projetos/${projetoId}/fluxo/dimensionamento`
      case 'composicao':
        return `/composicao?projeto=${encodeURIComponent(projetoId)}`
      default:
        return `/projetos/${projetoId}`
    }
  }

  function bloqueada(etapa: ProjetoFluxoEtapaId): boolean {
    if (etapa === 'projeto') return false
    if (etapa === 'cargas') return false
    if (etapa === 'dimensionamento') return !gates.podeAcessarDimensionamento
    if (etapa === 'composicao') return !gates.podeAcessarComposicao
    return true
  }

  function tituloBloqueio(etapa: ProjetoFluxoEtapaId): string | undefined {
    if (!bloqueada(etapa)) return undefined
    if (etapa === 'dimensionamento') return 'Cadastre ao menos uma carga antes desta etapa.'
    if (etapa === 'composicao')
      return 'Conclua a revisão e aprovação das bitolas de condutores antes da composição.'
    return undefined
  }

  const ordemAtual = ETAPAS.findIndex((e) => e.id === etapaAtual)
  const proximaDef = ordemAtual >= 0 && ordemAtual < ETAPAS.length - 1 ? ETAPAS[ordemAtual + 1] : null
  const proximaBloqueada = proximaDef ? bloqueada(proximaDef.id) : true
  const proximaHref = proximaDef && !proximaBloqueada ? hrefPara(proximaDef.id) : null
  /** Título curto para CTA (sem o prefixo "1. ") */
  const tituloCurto = (label: string) => label.replace(/^\d+\.\s*/, '')

  return (
    <nav
      className="projeto-fluxo-stepper card mb-4 border-0 shadow-sm"
      aria-label="Etapas do fluxo do painel"
      aria-describedby={hintId}
    >
      <div className="card-body py-3 px-3 px-md-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <h2 className="h6 mb-0 text-muted text-uppercase small fw-semibold letter-spacing-wide">
            Fluxo do painel
          </h2>
          {gates.loading ? (
            <span className="small text-muted" aria-live="polite">
              A verificar etapas…
            </span>
          ) : null}
        </div>
        <p id={hintId} className={`small text-muted ${compact ? 'mb-2' : 'mb-3 mb-md-2'}`}>
          {compact
            ? 'Toque numa etapa ou use o atalho abaixo para avançar.'
            : 'Siga a ordem das etapas. Pode clicar numa caixa acima ou no botão abaixo para ir à próxima etapa disponível.'}
        </p>
        <ol className="list-unstyled d-flex flex-wrap gap-1 gap-md-2 mb-0 align-items-stretch projeto-fluxo-stepper__track">
          {ETAPAS.map((etapa, idx) => {
            const ativa = etapa.id === etapaAtual
            const concluida = ordemAtual > idx
            const lock = bloqueada(etapa.id)
            const titulo = tituloBloqueio(etapa.id)
            const href = hrefPara(etapa.id)

            const classPill = [
              'projeto-fluxo-stepper__pill',
              'd-flex flex-column align-items-center justify-content-center text-center px-2 py-2 rounded-3 border',
              ativa ? 'projeto-fluxo-stepper__pill--active border-primary bg-primary-subtle' : '',
              concluida && !ativa ? 'projeto-fluxo-stepper__pill--done border-success-subtle bg-success-subtle' : '',
              lock ? 'projeto-fluxo-stepper__pill--locked opacity-60' : '',
            ]
              .filter(Boolean)
              .join(' ')

            const inner = (
              <>
                <span className={`fw-semibold small ${ativa ? 'text-primary' : ''}`}>{etapa.label}</span>
                {!compact ? (
                  <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                    {etapa.descricao}
                  </span>
                ) : null}
              </>
            )

            return (
              <Fragment key={etapa.id}>
                {idx > 0 ? (
                  <li
                    className="projeto-fluxo-stepper__sep d-none d-md-flex align-items-center justify-content-center flex-shrink-0 px-1"
                    aria-hidden
                  >
                    <span className="projeto-fluxo-stepper__arrow text-muted fw-semibold">›</span>
                  </li>
                ) : null}
                <li className="flex-grow-1" style={{ minWidth: '7rem', maxWidth: '14rem' }}>
                  {lock ? (
                    <span
                      className={classPill}
                      title={titulo}
                      aria-current={ativa ? 'step' : undefined}
                      aria-disabled
                    >
                      {inner}
                    </span>
                  ) : (
                    <Link
                      to={href}
                      className={`${classPill} text-decoration-none text-body projeto-fluxo-stepper__link`}
                      aria-current={ativa ? 'step' : undefined}
                      title={`${etapa.descricao} — clique para abrir`}
                    >
                      {inner}
                    </Link>
                  )}
                </li>
              </Fragment>
            )
          })}
        </ol>

        {!gates.loading && proximaDef ? (
          <div className="mt-3 pt-3 border-top border-light-subtle">
            {proximaHref ? (
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="small text-muted me-1">Próxima etapa:</span>
                <Link to={proximaHref} className="btn btn-primary btn-sm">
                  Continuar para {tituloCurto(proximaDef.label)}
                  <span aria-hidden> →</span>
                </Link>
              </div>
            ) : (
              <p className="small text-muted mb-0">
                <strong className="text-body">Próxima etapa:</strong> {tituloCurto(proximaDef.label)}{' '}
                <span className="text-muted">— {tituloBloqueio(proximaDef.id) ?? 'ainda não disponível.'}</span>
              </p>
            )}
          </div>
        ) : null}
      </div>
    </nav>
  )
}
