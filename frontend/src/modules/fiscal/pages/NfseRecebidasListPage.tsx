import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { useFiscalConfigQuery } from '../hooks/useFiscalConfigQuery'
import { listarNfseRecebidas } from '../services/fiscalNfseRecebidaService'
import { isNfseAdnSyncDisponivel } from '../types/fiscalConfig'
import { formatCnpjExibicao, formatDataIso, formatMoedaBrl } from '../utils/fiscalDisplay'
import SincronizarNfseAdnButton from '../components/SincronizarNfseAdnButton'

/** Lista NFS-es de serviço recebidas (sincronizadas via ADN ou importação futura). */
export default function NfseRecebidasListPage() {
  const { data: config } = useFiscalConfigQuery()
  const { data, isFetching, isError, error } = useQuery({
    queryKey: [...fiscalQueryKeys.nfseRecebidasAll, 1],
    queryFn: () => listarNfseRecebidas(1),
  })

  return (
    <div className="container-fluid">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            NFS-es recebidas
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">NFS-es de serviço recebidas</h1>
          <p className="text-muted mb-0">
            Notas em que a ZFW é tomadora, obtidas via ADN (Sistema Nacional NFS-e).
          </p>
        </div>
        <SincronizarNfseAdnButton
          cnpj={config?.cnpj_empresa}
          disabled={!isNfseAdnSyncDisponivel(config)}
        />
      </div>

      {isFetching && <p className="text-muted">A carregar…</p>}
      {isError && (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Erro ao listar NFS-es.'}
        </div>
      )}

      {data?.items.length === 0 && !isFetching && (
        <p className="text-muted">Nenhuma NFS-e recebida importada ainda.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle">
            <thead>
              <tr>
                <th>Número</th>
                <th>Prestador</th>
                <th>Emissão</th>
                <th className="text-end">Valor</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((doc) => (
                <tr key={doc.public_id}>
                  <td className="font-monospace">
                    <Link to={fiscalPaths.nfseRecebidaDetalhe(doc.public_id)}>{doc.numero}</Link>
                  </td>
                  <td>
                    <div>{doc.nome_prestador || formatCnpjExibicao(doc.cnpj_prestador)}</div>
                    <div className="small text-muted">{formatCnpjExibicao(doc.cnpj_prestador)}</div>
                  </td>
                  <td>{formatDataIso(doc.data_emissao)}</td>
                  <td className="text-end">{formatMoedaBrl(doc.valor_total)}</td>
                  <td>{doc.origem_importacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
