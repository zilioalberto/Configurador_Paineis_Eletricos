import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import apiClient from '@/services/apiClient'
import { obterPreviewOfertaOrcamento } from '../services/orcamentosApi'
import type { OrcamentoPreviewOfertaDto } from '../types/orcamentos'

import PropostaClienteDocument from './PropostaClienteDocument'
import { imprimirPropostaCliente } from '../utils/imprimirPropostaCliente'
import './PropostaClienteDocument.css'

export default function OrcamentoOfertaPrintModal({
  id,
  onClose,
  onApply,
  onApplyLocal,
}: {
  id: string
  onClose: () => void
  onApply?: (unified: string) => void
  onApplyLocal?: (unified: string) => void
}) {
  const [preview, setPreview] = useState<OrcamentoPreviewOfertaDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [unified, setUnified] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const p = await obterPreviewOfertaOrcamento(id)
      setPreview(p)
      setUnified(p.secoes.map((s) => `${s.titulo}\n${s.conteudo}`).join('\n\n'))
    } catch {
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    carregar().catch(() => undefined)
  }, [carregar])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  if (!id) return null

  return createPortal(
    <div className="proposta-cliente-modal" role="dialog" aria-modal="true" aria-labelledby="oferta-modal-titulo">
      <button
        type="button"
        className="proposta-cliente-modal__backdrop"
        aria-label="Fechar pré-visualização"
        onClick={onClose}
      />
      <div className="proposta-cliente-modal__content">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <h3 id="oferta-modal-titulo" className="mb-0">
            Pré-visualizar proposta
          </h3>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              Fechar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={async () => {
                try {
                  const res = await apiClient.get(`/orcamentos/${id}/gerar-pdf-oferta/`, {
                    responseType: 'blob',
                    headers: { Accept: '*/*' },
                  })
                  const url = globalThis.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `orcamento_${id}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  globalThis.URL.revokeObjectURL(url)
                } catch {
                  imprimirPropostaCliente()
                }
              }}
            >
              Gerar PDF no servidor
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => globalThis.open(`/orcamentos/${id}/oferta`, '_blank', 'noopener,noreferrer')}
            >
              Abrir página de impressão
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => imprimirPropostaCliente()}>
              Imprimir / salvar PDF
            </button>
          </div>
        </div>

        <div className="proposta-cliente-modal__corpo">
          {loading ? (
            <p className="text-muted">Carregando pré-visualização…</p>
          ) : preview ? (
            <div className="row g-3">
              <div className="col-lg-7">
                <div className="proposta-cliente-modal__preview">
                  <PropostaClienteDocument preview={preview} />
                </div>
              </div>

              <div className="col-lg-5">
                <div className="mb-2">
                  <label className="form-label" htmlFor="oferta-unified-editor">
                    Edição unificada de conteúdo
                  </label>
                  <textarea
                    id="oferta-unified-editor"
                    className="form-control"
                    rows={18}
                    value={unified}
                    onChange={(e) => setUnified(e.target.value)}
                  />
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      if (!preview) return
                      setPreview({
                        ...preview,
                        secoes: [{ tipo: 'OBSERVACOES', titulo: 'Documento', conteudo: unified }],
                      })
                    }}
                  >
                    Aplicar à pré-visualização
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      if (onApplyLocal) {
                        onApplyLocal(unified)
                        onClose()
                        return
                      }
                      if (!preview) return
                      setPreview({
                        ...preview,
                        secoes: [{ tipo: 'OBSERVACOES', titulo: 'Documento', conteudo: unified }],
                      })
                      onClose()
                    }}
                  >
                    Salvar localmente
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      if (onApply) {
                        onApply(unified)
                        onClose()
                      }
                    }}
                  >
                    Salvar no servidor
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setUnified(
                        preview.secoes.map((s) => `${s.titulo}\n${s.conteudo}`).join('\n\n') || ''
                      )
                    }
                  >
                    Reverter
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted">Pré-visualização não disponível.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
