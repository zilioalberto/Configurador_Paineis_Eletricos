import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { fiscalPaths } from '../fiscalPaths'
import { useControleNsuQuery } from '../hooks/useControleNsuQuery'
import { useFiscalConfigQuery } from '../hooks/useFiscalConfigQuery'
import { formatCnpjExibicao, formatDataIso } from '../utils/fiscalDisplay'
import SincronizarNfesSefazButton from './SincronizarNfesSefazButton'

/** Resumo do NSU da empresa (sincronização SEFAZ no servidor) na home fiscal. */
export default function FiscalNsuStatusCard() {
  const { data: config, isPending: configPending } = useFiscalConfigQuery()
  const cnpj = config?.cnpj_empresa ?? ''
  const {
    data: nsu,
    isFetching,
    isError,
    error,
  } = useControleNsuQuery(cnpj, cnpj.length === 14)

  const [bloqueado, setBloqueado] = useState(false)

  useEffect(() => {
    if (!nsu?.bloqueado_ate) {
      setBloqueado(false)
      return
    }
    const atualizar = () => {
      setBloqueado(new Date(nsu.bloqueado_ate!).getTime() > Date.now())
    }
    atualizar()
    const timer = window.setInterval(atualizar, 60_000)
    return () => window.clearInterval(timer)
  }, [nsu?.bloqueado_ate])

  if (configPending) {
    return null
  }

  if (!cnpj) {
    return (
      <div className="alert alert-secondary small mb-4" role="status">
        Configure <code>FISCAL_EMPRESA_CNPJ</code> no servidor para exibir o estado da sincronização
        SEFAZ aqui.
      </div>
    )
  }

  return (
    <div className={`card mb-4 ${bloqueado ? 'border-warning' : 'border-0 shadow-sm'}`}>
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <div>
            <h2 className="h6 mb-1">Sincronização SEFAZ (NSU)</h2>
            <p className="small text-muted mb-0">
              Empresa {formatCnpjExibicao(cnpj)}
              {config?.sefaz_sync_configurado ?? config?.agente_ponte_configurado ? (
                <span className="badge bg-success ms-2">SEFAZ configurado</span>
              ) : (
                <span className="badge bg-warning text-dark ms-2">Certificado A1 ausente no servidor</span>
              )}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <SincronizarNfesSefazButton
              cnpj={cnpj}
              className="btn btn-primary"
              size="sm"
              disabled={
                bloqueado || !(config?.sefaz_sync_configurado ?? config?.agente_ponte_configurado)
              }
            />
            <Link to={fiscalPaths.nsu} className="btn btn-sm btn-outline-secondary">
              Detalhes
            </Link>
          </div>
        </div>

        {isFetching && <p className="small text-muted mb-0">A carregar estado…</p>}
        {isError && (
          <p className="small text-danger mb-0">
            {error instanceof Error ? error.message : 'Não foi possível ler o NSU.'}
          </p>
        )}
        {nsu && !isFetching && (
          <dl className="row small mb-0 gy-1">
            <dt className="col-sm-3 col-md-2">Último NSU</dt>
            <dd className="col-sm-9 col-md-4 font-monospace">{nsu.ultimo_nsu || '—'}</dd>
            <dt className="col-sm-3 col-md-2">Max NSU</dt>
            <dd className="col-sm-9 col-md-4 font-monospace">{nsu.max_nsu || '—'}</dd>
            <dt className="col-sm-3 col-md-2">cStat</dt>
            <dd className="col-sm-9 col-md-4">
              {nsu.ultimo_cstat || '—'}
              {nsu.ultimo_motivo ? (
                <span className="text-muted"> — {nsu.ultimo_motivo}</span>
              ) : null}
            </dd>
            <dt className="col-sm-3 col-md-2">Última consulta</dt>
            <dd className="col-sm-9 col-md-4">{formatDataIso(nsu.ultima_consulta)}</dd>
            {bloqueado ? (
              <>
                <dt className="col-sm-3 col-md-2">Bloqueado até</dt>
                <dd className="col-sm-9 col-md-4 text-warning">
                  {formatDataIso(nsu.bloqueado_ate)}
                </dd>
              </>
            ) : null}
          </dl>
        )}
        {bloqueado ? (
          <p className="small text-warning mt-2 mb-0">
            Consulta temporariamente bloqueada pela SEFAZ (consumo indevido). Aguarde o horário
            indicado em &quot;Bloqueado até&quot;.
          </p>
        ) : null}
      </div>
    </div>
  )
}
