import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { solicitarManifestacaoDestinatario } from '../services/fiscalNfeService'
import type {
  DocumentoFiscalRecebidoDetail,
  TipoManifestacaoDestinatario,
} from '../types/documentoFiscalRecebido'
import {
  formatDataIso,
  labelStatusManifestacao,
  labelTipoManifestacao,
} from '../utils/fiscalDisplay'

const TIPOS: { tipo: TipoManifestacaoDestinatario; label: string; variant: string }[] = [
  { tipo: 'CIENCIA', label: 'Ciência', variant: 'outline-primary' },
  { tipo: 'CONFIRMACAO', label: 'Confirmar operação', variant: 'primary' },
  { tipo: 'DESCONHECIMENTO', label: 'Desconhecimento', variant: 'outline-secondary' },
  { tipo: 'NAO_REALIZADA', label: 'Operação não realizada', variant: 'outline-warning' },
]

function badgeClass(status: DocumentoFiscalRecebidoDetail['manifestacao_status']): string {
  switch (status) {
    case 'MANIFESTADA':
      return 'bg-success'
    case 'PENDENTE':
      return 'bg-warning text-dark'
    case 'ERRO':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

type Props = {
  readonly documento: DocumentoFiscalRecebidoDetail
}

/** Painel de manifestação do destinatário (envio via ponte A3). */
export default function NfeManifestacaoDestinatarioPanel({ documento }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const podeEditar = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)

  const [justificativa, setJustificativa] = useState('')
  const [tipoJustificativa, setTipoJustificativa] = useState<TipoManifestacaoDestinatario | null>(
    null,
  )

  const mutation = useMutation({
    mutationFn: (tipo: TipoManifestacaoDestinatario) =>
      solicitarManifestacaoDestinatario(documento.id, {
        tipo,
        justificativa: tipo === 'NAO_REALIZADA' ? justificativa : undefined,
      }),
    onSuccess: (res) => {
      showToast({ variant: 'success', message: res.message })
      queryClient
        .invalidateQueries({ queryKey: fiscalQueryKeys.nfeRecebida(documento.id) })
        .catch(() => undefined)
      queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all }).catch(() => undefined)
      setTipoJustificativa(null)
      setJustificativa('')
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        message:
          extrairMensagemErroApi(err) || 'Não foi possível solicitar a manifestação.',
      })
    },
  })

  const onSolicitar = useCallback(
    (tipo: TipoManifestacaoDestinatario) => {
      if (tipo === 'NAO_REALIZADA') {
        setTipoJustificativa(tipo)
        if (justificativa.trim().length < 15) {
          showToast({
            variant: 'danger',
            message: 'Informe a justificativa (mínimo 15 caracteres).',
          })
          return
        }
      }
      mutation.mutate(tipo)
    },
    [justificativa, mutation, showToast],
  )

  const pendente = documento.manifestacao_status === 'PENDENTE'
  const bloqueado = pendente || !podeEditar

  return (
    <div className="card mb-4">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 mb-0">Manifestação do destinatário</h2>
        <span className={`badge ${badgeClass(documento.manifestacao_status)}`}>
          {labelStatusManifestacao(documento.manifestacao_status)}
        </span>
      </div>
      <div className="card-body">
        <p className="small text-muted">
          Eventos enviados à SEFAZ pelo agente local (<code>fiscal-ponte</code>) com certificado A3.
          Após solicitar, aguarde o próximo ciclo de sincronização ou execute{' '}
          <code>manifestar-pendentes</code> na máquina da ponte.
        </p>

        <dl className="row small mb-3 gy-1">
          <dt className="col-sm-3">Último tipo</dt>
          <dd className="col-sm-9">{labelTipoManifestacao(documento.manifestacao_tipo)}</dd>
          {documento.manifestacao_protocolo ? (
            <>
              <dt className="col-sm-3">Protocolo</dt>
              <dd className="col-sm-9 font-monospace">{documento.manifestacao_protocolo}</dd>
            </>
          ) : null}
          {documento.manifestacao_cstat ? (
            <>
              <dt className="col-sm-3">cStat / motivo</dt>
              <dd className="col-sm-9">
                {documento.manifestacao_cstat}
                {documento.manifestacao_motivo ? ` — ${documento.manifestacao_motivo}` : ''}
              </dd>
            </>
          ) : null}
          {documento.manifestacao_solicitada_em ? (
            <>
              <dt className="col-sm-3">Solicitada em</dt>
              <dd className="col-sm-9">{formatDataIso(documento.manifestacao_solicitada_em)}</dd>
            </>
          ) : null}
          {documento.manifestacao_registrada_em ? (
            <>
              <dt className="col-sm-3">Registrada em</dt>
              <dd className="col-sm-9">{formatDataIso(documento.manifestacao_registrada_em)}</dd>
            </>
          ) : null}
        </dl>

        {podeEditar ? null : (
          <p className="small text-muted mb-0">Sem permissão para solicitar manifestação.</p>
        )}

        {pendente ? (
          <div className="alert alert-warning small mb-0" role="status">
            Manifestação pendente na fila da ponte A3. Novas solicitações ficam bloqueadas até concluir
            ou falhar.
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.tipo}
                type="button"
                className={`btn btn-sm btn-${t.variant}`}
                disabled={bloqueado || mutation.isPending}
                onClick={() => {
                  if (t.tipo === 'NAO_REALIZADA' && tipoJustificativa !== 'NAO_REALIZADA') {
                    setTipoJustificativa('NAO_REALIZADA')
                    return
                  }
                  onSolicitar(t.tipo)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {tipoJustificativa === 'NAO_REALIZADA' && !pendente && podeEditar ? (
          <div className="mt-3">
            <label className="form-label" htmlFor="manifestacao-justificativa">
              Justificativa (obrigatória)
            </label>
            <textarea
              id="manifestacao-justificativa"
              className="form-control"
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da operação não realizada (mín. 15 caracteres)."
            />
            <div className="d-flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-sm btn-warning"
                disabled={mutation.isPending || justificativa.trim().length < 15}
                onClick={() => onSolicitar('NAO_REALIZADA')}
              >
                Enviar operação não realizada
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setTipoJustificativa(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
