import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { useFiscalConfigQuery } from '../hooks/useFiscalConfigQuery'
import { obterControleNsuNfseAdn } from '../services/fiscalNfseRecebidaService'
import { isNfseAdnSyncDisponivel } from '../types/fiscalConfig'
import { formatCnpjExibicao, formatDataIso } from '../utils/fiscalDisplay'
import SincronizarNfseAdnButton from './SincronizarNfseAdnButton'

function NfseAdnIndisponivelAlert({
  config,
}: {
  readonly config: ReturnType<typeof useFiscalConfigQuery>['data']
}) {
  if (!config || isNfseAdnSyncDisponivel(config)) return null
  const alertClass =
    config.nfse_adn_sync_modo === 'stub' ? 'alert alert-warning' : 'alert alert-danger'
  return (
    <div className={`${alertClass} small mb-3`} role="alert">
      <strong>Sincronização ADN indisponível.</strong>{' '}
      {config.nfse_adn_sync_mensagem ??
        'Configure certificado A1 e FISCAL_NFSE_ADN_PROVIDER=native no servidor.'}
    </div>
  )
}

/** Card de sincronização NFS-e Nacional (ADN) na home fiscal. */
export default function FiscalNfseAdnStatusCard() {
  const { data: config, isPending } = useFiscalConfigQuery()
  const cnpj = config?.cnpj_empresa ?? ''
  const cnpjDigits = cnpj.replace(/\D/g, '')
  const controleQuery = useQuery({
    queryKey: fiscalQueryKeys.controleNsuNfseAdn(cnpjDigits),
    queryFn: () => obterControleNsuNfseAdn(cnpjDigits),
    enabled: cnpjDigits.length === 14,
  })
  const controle = controleQuery.data
  const bloqueado =
    !!controle?.bloqueado_ate && new Date(controle.bloqueado_ate).getTime() > Date.now()

  if (isPending || !cnpj) return null

  return (
    <div className="card mb-4 border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <div>
            <h2 className="h6 mb-1">NFS-e de serviço recebidas (ADN)</h2>
            <p className="small text-muted mb-0">
              Empresa {formatCnpjExibicao(cnpj)}
              {(() => {
                if (isNfseAdnSyncDisponivel(config)) {
                  return <span className="badge bg-success ms-2">ADN pronto</span>
                }
                if (config?.nfse_adn_sync_modo === 'stub') {
                  return <span className="badge bg-warning text-dark ms-2">Modo simulado</span>
                }
                return <span className="badge bg-warning text-dark ms-2">Certificado ausente</span>
              })()}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <SincronizarNfseAdnButton
              cnpj={cnpj}
              className="btn btn-outline-primary"
              size="sm"
              disabled={!isNfseAdnSyncDisponivel(config) || bloqueado}
            />
            <Link to={fiscalPaths.nfseRecebidas} className="btn btn-sm btn-outline-secondary">
              Ver NFS-es
            </Link>
          </div>
        </div>
        <NfseAdnIndisponivelAlert config={config} />
        {controle ? (
          <dl className="row small mb-3">
            <dt className="col-sm-3 col-md-2">Último NSU</dt>
            <dd className="col-sm-3 col-md-4 font-monospace">{controle.ultimo_nsu}</dd>
            <dt className="col-sm-3 col-md-2">Max NSU</dt>
            <dd className="col-sm-3 col-md-4 font-monospace">{controle.max_nsu ?? '—'}</dd>
            <dt className="col-sm-3 col-md-2">Status</dt>
            <dd className="col-sm-3 col-md-4">
              {controle.ultimo_status || '—'}
              {controle.ultimo_motivo ? ` — ${controle.ultimo_motivo}` : ''}
            </dd>
            <dt className="col-sm-3 col-md-2">Última consulta</dt>
            <dd className="col-sm-3 col-md-4">{formatDataIso(controle.ultima_consulta)}</dd>
            {controle.bloqueado_ate ? (
              <>
                <dt className="col-sm-3 col-md-2">Consultar após</dt>
                <dd className={bloqueado ? 'col-sm-3 col-md-4 text-warning' : 'col-sm-3 col-md-4'}>
                  {formatDataIso(controle.bloqueado_ate)}
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}
        <p className="small text-muted mb-0">
          Consulta notas de serviço emitidas contra o CNPJ da ZFW no Sistema Nacional NFS-e
          (Ambiente de Dados Nacional). Requer município conveniado e nota compartilhada no ADN.
        </p>
      </div>
    </div>
  )
}
