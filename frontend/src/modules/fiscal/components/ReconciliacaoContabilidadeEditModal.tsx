import { useEffect, useState, type FormEvent } from 'react'

import {
  formatMoedaInput,
  parseMoedaPt,
} from '../utils/fiscalDisplay'
import type { ReconciliacaoFiscalDto } from '../services/fiscalObrigacoesService'

export type ReconciliacaoContabilidadePayload = {
  valor_contabilidade?: string | null
  icms_entradas?: string | null
  icms_saidas?: string | null
}

function valorInicial(rec: ReconciliacaoFiscalDto): string {
  return formatMoedaInput(rec.valor_contabilidade)
}

function icmsEntradasInicial(rec: ReconciliacaoFiscalDto): string {
  const raw = rec.detalhes.dime_entradas
  return typeof raw === 'string' ? formatMoedaInput(raw) : ''
}

function icmsSaidasInicial(rec: ReconciliacaoFiscalDto): string {
  const raw = rec.detalhes.dime_saidas ?? rec.valor_contabilidade
  return typeof raw === 'string' ? formatMoedaInput(raw) : valorInicial(rec)
}

/** Modal para informar/editar valor da coluna Contabilidade na conciliação. */
export function ReconciliacaoContabilidadeEditModal({
  reconciliacao,
  isSubmitting,
  onClose,
  onSave,
}: Readonly<{
  reconciliacao: ReconciliacaoFiscalDto
  isSubmitting: boolean
  onClose: () => void
  onSave: (payload: ReconciliacaoContabilidadePayload) => Promise<void>
}>) {
  const [valor, setValor] = useState(() => valorInicial(reconciliacao))
  const [icmsEntradas, setIcmsEntradas] = useState(() => icmsEntradasInicial(reconciliacao))
  const [icmsSaidas, setIcmsSaidas] = useState(() => icmsSaidasInicial(reconciliacao))
  const [erro, setErro] = useState('')
  const isIcms = reconciliacao.tipo === 'ICMS'

  useEffect(() => {
    setValor(valorInicial(reconciliacao))
    setIcmsEntradas(icmsEntradasInicial(reconciliacao))
    setIcmsSaidas(icmsSaidasInicial(reconciliacao))
    setErro('')
  }, [reconciliacao])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [isSubmitting, onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isIcms) {
      const entNum = parseMoedaPt(icmsEntradas)
      const saiNum = parseMoedaPt(icmsSaidas)
      if (!Number.isFinite(entNum) || entNum < 0 || !Number.isFinite(saiNum) || saiNum < 0) {
        setErro('Informe valores válidos para entradas e saídas contábeis.')
        return
      }
      setErro('')
      await onSave({
        icms_entradas: entNum.toFixed(2),
        icms_saidas: saiNum.toFixed(2),
        valor_contabilidade: saiNum.toFixed(2),
      })
      return
    }

    const valorNum = parseMoedaPt(valor)
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      setErro('Informe um valor válido (ex.: 1.118,26).')
      return
    }
    setErro('')
    await onSave({ valor_contabilidade: valorNum.toFixed(2) })
  }

  return (
    <>
      <dialog
        open
        className="modal fade show d-block"
        style={{ zIndex: 1060 }}
        aria-modal="true"
        aria-labelledby="reconciliacao-contabilidade-modal-title"
      >
        <div className="modal-dialog modal-dialog-centered px-2">
          <form className="modal-content" onSubmit={(e) => void handleSubmit(e)}>
            <div className="modal-header">
              <h2 id="reconciliacao-contabilidade-modal-title" className="modal-title h5 mb-0">
                Contabilidade — {reconciliacao.tipo_label}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Fechar"
              />
            </div>
            <div className="modal-body">
              <p className="text-muted small">
                Use quando o PDF não pôde ser lido (escaneado) ou para corrigir o valor extraído.
                {reconciliacao.fonte_contabilidade === 'manual'
                  ? ' Valor informado manualmente.'
                  : null}
              </p>
              {isIcms ? (
                <>
                  <div className="mb-3">
                    <label htmlFor="icms-entradas" className="form-label">
                      DIME — entradas contábeis (R$)
                    </label>
                    <input
                      id="icms-entradas"
                      type="text"
                      inputMode="decimal"
                      className={`form-control ${erro ? 'is-invalid' : ''}`}
                      value={icmsEntradas}
                      onChange={(e) => {
                        setIcmsEntradas(e.target.value)
                        if (erro) setErro('')
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="mb-0">
                    <label htmlFor="icms-saidas" className="form-label">
                      DIME — saídas contábeis (R$)
                    </label>
                    <input
                      id="icms-saidas"
                      type="text"
                      inputMode="decimal"
                      className={`form-control ${erro ? 'is-invalid' : ''}`}
                      value={icmsSaidas}
                      onChange={(e) => {
                        setIcmsSaidas(e.target.value)
                        if (erro) setErro('')
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="mb-0">
                  <label htmlFor="contabilidade-valor" className="form-label">
                    Valor contabilidade (R$)
                  </label>
                  <input
                    id="contabilidade-valor"
                    type="text"
                    inputMode="decimal"
                    className={`form-control ${erro ? 'is-invalid' : ''}`}
                    value={valor}
                    onChange={(e) => {
                      setValor(e.target.value)
                      if (erro) setErro('')
                    }}
                    autoFocus
                  />
                  {reconciliacao.tipo === 'DAS_INSS' ? (
                    <div className="form-text">Corresponde ao INSS cód. 1006 do DAS.</div>
                  ) : null}
                </div>
              )}
              {erro ? <div className="invalid-feedback d-block mt-2">{erro}</div> : null}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
      <button
        type="button"
        className="modal-backdrop fade show"
        style={{ zIndex: 1055 }}
        aria-label="Fechar"
        disabled={isSubmitting}
        onClick={onClose}
      />
    </>
  )
}
