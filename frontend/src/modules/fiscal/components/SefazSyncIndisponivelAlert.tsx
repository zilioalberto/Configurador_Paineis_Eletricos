import type { FiscalModuloConfigDto } from '../types/fiscalConfig'
import { isSefazSyncDisponivel } from '../types/fiscalConfig'

type Props = {
  readonly config: FiscalModuloConfigDto | null | undefined
}

/** Alerta visível quando a sincronização SEFAZ não está disponível (certificado ausente ou modo stub). */
export default function SefazSyncIndisponivelAlert({ config }: Props) {
  if (!config || isSefazSyncDisponivel(config)) {
    return null
  }

  const alertClass =
    config.sefaz_sync_modo === 'stub' ? 'alert alert-warning' : 'alert alert-danger'

  return (
    <div className={`${alertClass} small mb-3`} role="alert">
      <strong>Sincronização com a SEFAZ indisponível.</strong>{' '}
      {config.sefaz_sync_mensagem ??
        'Configure o certificado A1 (FISCAL_CERT_PATH e FISCAL_CERT_PASSWORD) no servidor.'}
    </div>
  )
}
