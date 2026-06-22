import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { aplicarMascaraCnpj, apenasDigitosCnpj } from '@/modules/cadastros/utils/cnpjMask'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { useControleNsuQuery } from '../hooks/useControleNsuQuery'
import { useFiscalConfigQuery } from '../hooks/useFiscalConfigQuery'
import { atualizarControleNsu } from '../services/fiscalNfeService'
import SincronizarNfesSefazButton from '../components/SincronizarNfesSefazButton'
import SefazControleNsuAlert from '../components/SefazControleNsuAlert'
import SefazSyncIndisponivelAlert from '../components/SefazSyncIndisponivelAlert'
import { isSefazSyncDisponivel } from '../types/fiscalConfig'
import { formatCnpjExibicao, formatDataIso } from '../utils/fiscalDisplay'

/** Consulta o estado de sincronização NSU e permite busca manual na SEFAZ. */
export default function ControleNsuPage() {
  const { data: fiscalConfig } = useFiscalConfigQuery()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const podeEditar = hasPermission(user, PERMISSION_KEYS.FISCAL_EDITAR)
  const [cnpjInput, setCnpjInput] = useState('')
  const [cnpjConsulta, setCnpjConsulta] = useState('')
  const [autoConsulta, setAutoConsulta] = useState(false)
  const [nsuEdit, setNsuEdit] = useState('')

  useEffect(() => {
    const cnpj = fiscalConfig?.cnpj_empresa ?? ''
    if (cnpj.length === 14 && !cnpjConsulta) {
      setCnpjInput(aplicarMascaraCnpj(cnpj))
      setCnpjConsulta(cnpj)
      setAutoConsulta(true)
    }
  }, [fiscalConfig?.cnpj_empresa, cnpjConsulta])

  const digits = apenasDigitosCnpj(cnpjConsulta)
  const { data, isFetching, isError, error, refetch } = useControleNsuQuery(digits, digits.length === 14)

  const onCnpjChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCnpjInput(aplicarMascaraCnpj(e.target.value))
  }, [])

  const onConsultar = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      setCnpjConsulta(apenasDigitosCnpj(cnpjInput))
    },
    [cnpjInput],
  )

  const atualizarNsuMutation = useMutation({
    mutationFn: (novoNsu: string) => atualizarControleNsu(digits, novoNsu),
    onSuccess: (res) => {
      queryClient.setQueryData(fiscalQueryKeys.controleNsu(digits), res)
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.controleNsu(digits) })
      setNsuEdit('')
      showToast({
        variant: 'success',
        title: 'NSU atualizado',
        message: `Último NSU definido para ${res.ultimo_nsu}.`,
      })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'NSU',
        message: extrairMensagemErroApi(err) || 'Não foi possível atualizar o NSU.',
      })
    },
  })

  return (
    <div className="container-fluid" style={{ maxWidth: '40rem' }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Controle NSU
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Controle NSU (SEFAZ)</h1>
      <p className="text-muted mb-3">
        Estado guardado no servidor (fonte de verdade do NSU). Use o botão abaixo para consultar a
        SEFAZ e importar NF-es emitidas contra o CNPJ da empresa (certificado A1 no servidor).
      </p>
      <SefazSyncIndisponivelAlert config={fiscalConfig} />
      <div className="mb-4">
        <SincronizarNfesSefazButton
          cnpj={fiscalConfig?.cnpj_empresa ?? digits}
          disabled={!isSefazSyncDisponivel(fiscalConfig)}
        />
      </div>
      {fiscalConfig?.cnpj_empresa && !autoConsulta ? (
        <p className="small text-muted mb-3">
          CNPJ da empresa no servidor: {formatCnpjExibicao(fiscalConfig.cnpj_empresa)}.{' '}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 align-baseline"
            onClick={() => {
              setCnpjInput(aplicarMascaraCnpj(fiscalConfig.cnpj_empresa))
              setCnpjConsulta(fiscalConfig.cnpj_empresa)
            }}
          >
            Consultar este CNPJ
          </button>
        </p>
      ) : null}

      <form onSubmit={onConsultar} className="card mb-4">
        <div className="card-body">
          <label className="form-label fw-semibold" htmlFor="nsu-cnpj">
            CNPJ da empresa
          </label>
          <div className="d-flex flex-wrap gap-2">
            <input
              id="nsu-cnpj"
              type="text"
              className="form-control"
              style={{ maxWidth: '16rem' }}
              value={cnpjInput}
              onChange={onCnpjChange}
              placeholder="00.000.000/0000-00"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={apenasDigitosCnpj(cnpjInput).length !== 14}>
              Consultar
            </button>
          </div>
        </div>
      </form>

      {digits.length > 0 && digits.length !== 14 && (
        <p className="text-warning">Informe um CNPJ com 14 dígitos.</p>
      )}

      {digits.length === 14 && isFetching && <p className="text-muted">A consultar…</p>}

      {digits.length === 14 && isError && (
        <div className="alert alert-danger" role="alert">
          {error instanceof Error ? error.message : 'Não foi possível obter o controle NSU.'}
        </div>
      )}

      <SefazControleNsuAlert nsu={data} />

      {data && (
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span className="fw-semibold">{formatCnpjExibicao(data.cnpj)}</span>
            <div className="d-flex flex-wrap gap-2">
              <SincronizarNfesSefazButton
                cnpj={data.cnpj}
                className="btn btn-primary"
                size="sm"
                disabled={!isSefazSyncDisponivel(fiscalConfig)}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => void refetch()}
              >
                Atualizar
              </button>
            </div>
          </div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between">
              <span className="text-muted">Último NSU</span>
              <span className="font-monospace">{data.ultimo_nsu || '—'}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span className="text-muted">Max NSU</span>
              <span className="font-monospace">{data.max_nsu || '—'}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span className="text-muted">Último cStat</span>
              <span>{data.ultimo_cstat || '—'}</span>
            </li>
            <li className="list-group-item">
              <span className="text-muted d-block mb-1">Último motivo</span>
              <span>{data.ultimo_motivo || '—'}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span className="text-muted">Bloqueado até</span>
              <span>{formatDataIso(data.bloqueado_ate)}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span className="text-muted">Última consulta</span>
              <span>{formatDataIso(data.ultima_consulta)}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between small text-muted">
              <span>Atualizado em</span>
              <span>{formatDataIso(data.atualizado_em)}</span>
            </li>
          </ul>
          {podeEditar && (
            <div className="card-footer">
              <label className="form-label small fw-semibold mb-1" htmlFor="nsu-editar">
                Definir último NSU
              </label>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <input
                  id="nsu-editar"
                  type="text"
                  inputMode="numeric"
                  className="form-control form-control-sm font-monospace"
                  style={{ maxWidth: '12rem' }}
                  value={nsuEdit}
                  onChange={(e) => setNsuEdit(e.target.value.replace(/\D/g, ''))}
                  placeholder={data.ultimo_nsu || '0'}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={atualizarNsuMutation.isPending || nsuEdit.trim() === ''}
                  onClick={() => atualizarNsuMutation.mutate(nsuEdit.trim())}
                >
                  Salvar NSU
                </button>
              </div>
              <p className="form-text mb-0">
                Ajuste avançado do NSU consumido (uso administrativo). Evite voltar o NSU
                ou zerar: a SEFAZ rejeita reconsumo com cStat 656 (Consumo Indevido) e
                bloqueia por 1 hora. A sincronização normal é incremental e automática.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
