import type { ReactNode } from 'react'

/**
 * Texto único para código e nome do projeto em todo o fluxo (cargas → dimensionamento → composição).
 * Usa em-dash entre código e nome; evita duplicar quando um só existe.
 */
export function formatProjetoCodigoNome(
  codigo?: string | null,
  nome?: string | null,
  fallbackId?: string | null
): string {
  const c = codigo?.trim() ?? ''
  const n = nome?.trim() ?? ''
  if (c && n) return `${c} — ${n}`
  if (c) return c
  if (n) return n
  if (fallbackId?.trim()) return fallbackId.trim()
  return '—'
}

const defaultId = 'projeto-identificacao-fluxo-valor'

type ProjetoIdentificacaoFluxoProps = {
  projetoCodigo?: string | null
  projetoNome?: string | null
  /** Quando não há código/nome no catálogo (ex.: só UUID). */
  fallbackId?: string | null
  /** Conteúdo opcional abaixo da faixa do projeto (links, ajuda). */
  footer?: ReactNode
  /**
   * `true`: só o bloco label + faixa (para usar dentro de um `card` já existente).
   * `false`: envolve em `card` próprio.
   */
  embedded?: boolean
  className?: string
  htmlId?: string
}

/**
 * Apresentação padronizada: rótulo «Projeto» + faixa com fundo neutro (`codigo — nome`).
 */
export function ProjetoIdentificacaoFluxo({
  projetoCodigo,
  projetoNome,
  fallbackId,
  footer,
  embedded = false,
  className,
  htmlId = defaultId,
}: ProjetoIdentificacaoFluxoProps) {
  const texto = formatProjetoCodigoNome(projetoCodigo, projetoNome, fallbackId)

  const bloco = (
    <>
      <label className="form-label fw-semibold mb-2" htmlFor={htmlId}>
        Projeto
      </label>
      <div
        id={htmlId}
        className="form-control-plaintext border rounded px-3 py-2 bg-body-secondary mb-0"
      >
        {texto}
      </div>
      {footer ? <div className="mt-2 mb-0">{footer}</div> : null}
    </>
  )

  if (embedded) {
    return <div className={className ?? 'mb-3'}>{bloco}</div>
  }

  return (
    <div className={`card mb-3 ${className ?? ''}`}>
      <div className="card-body py-3">{bloco}</div>
    </div>
  )
}
