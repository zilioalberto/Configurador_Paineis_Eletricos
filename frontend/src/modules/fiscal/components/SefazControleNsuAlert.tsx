import type { ControleNsuDto } from '../types/documentoFiscalRecebido'
import { obterAlertaControleNsu } from '../utils/sefazSyncFeedback'

type Props = {
  readonly nsu: ControleNsuDto | null | undefined
}

/** Alerta persistente com o último erro/bloqueio retornado pela SEFAZ (controle NSU). */
export default function SefazControleNsuAlert({ nsu }: Props) {
  const alerta = obterAlertaControleNsu(nsu)
  if (!alerta) return null

  const alertClass = alerta.variant === 'warning' ? 'alert alert-warning' : 'alert alert-danger'

  return (
    <div className={`${alertClass} small mb-3`} role="alert">
      <strong>{alerta.titulo}.</strong> {alerta.mensagem}
    </div>
  )
}
