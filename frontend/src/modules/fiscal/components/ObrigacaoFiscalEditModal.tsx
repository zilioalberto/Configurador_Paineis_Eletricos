import { useEffect, useState, type FormEvent } from 'react'

import {
  formatMoedaInput,
  parseMoedaPt,
  toDateInputValue,
} from '../utils/fiscalDisplay'
import type {
  AtualizarObrigacaoFiscalPayload,
  ObrigacaoFiscalDto,
} from '../services/fiscalObrigacoesService'
import { obrigacaoDasDoPdf } from '../utils/obrigacaoDas'

export type ObrigacaoFiscalEditFormState = {
  descricao: string
  valor: string
  inss_1006: string
  data_vencimento: string
  numero_documento: string
  observacoes: string
}

function linha1006(obrigacao: ObrigacaoFiscalDto): string {
  const linha = obrigacao.linhas_composicao.find((l) => l.codigo === '1006')
  return linha ? formatMoedaInput(linha.valor) : ''
}

function obrigacaoToFormState(obrigacao: ObrigacaoFiscalDto): ObrigacaoFiscalEditFormState {
  return {
    descricao: obrigacao.descricao ?? '',
    valor: formatMoedaInput(obrigacao.valor),
    inss_1006: linha1006(obrigacao),
    data_vencimento: toDateInputValue(obrigacao.data_vencimento),
    numero_documento: obrigacao.numero_documento ?? '',
    observacoes: obrigacao.observacoes ?? '',
  }
}

export function obrigacaoFormToPayload(
  form: ObrigacaoFiscalEditFormState,
  obrigacao: ObrigacaoFiscalDto,
): AtualizarObrigacaoFiscalPayload | null {
  const valorNum = parseMoedaPt(form.valor)
  if (!Number.isFinite(valorNum) || valorNum < 0) {
    return null
  }
  const payload: AtualizarObrigacaoFiscalPayload = {
    descricao: form.descricao.trim(),
    valor: valorNum.toFixed(2),
    data_vencimento: form.data_vencimento || null,
    numero_documento: form.numero_documento.trim(),
    observacoes: form.observacoes.trim(),
  }
  if (obrigacao.tipo === 'DAS') {
    const inssNum = parseMoedaPt(form.inss_1006)
    if (Number.isFinite(inssNum) && inssNum > 0) {
      payload.linhas_composicao = [
        {
          codigo: '1006',
          descricao: 'INSS - SIMPLES NACIONAL',
          valor: inssNum.toFixed(2),
        },
      ]
    }
  }
  return payload
}

/** Modal para editar valor e demais campos editáveis de uma obrigação fiscal. */
export function ObrigacaoFiscalEditModal({
  obrigacao,
  isSubmitting,
  onClose,
  onSave,
}: Readonly<{
  obrigacao: ObrigacaoFiscalDto
  isSubmitting: boolean
  onClose: () => void
  onSave: (payload: AtualizarObrigacaoFiscalPayload) => Promise<void>
}>) {
  const [form, setForm] = useState<ObrigacaoFiscalEditFormState>(() => obrigacaoToFormState(obrigacao))
  const [erroValor, setErroValor] = useState('')
  const dasDoPdf = obrigacaoDasDoPdf(obrigacao)
  const dasManual = obrigacao.tipo === 'DAS' && !dasDoPdf

  useEffect(() => {
    setForm(obrigacaoToFormState(obrigacao))
    setErroValor('')
  }, [obrigacao])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [isSubmitting, onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    let payload: AtualizarObrigacaoFiscalPayload | null
    if (dasDoPdf) {
      payload = {
        data_vencimento: form.data_vencimento || null,
        observacoes: form.observacoes.trim(),
      }
    } else {
      payload = obrigacaoFormToPayload(form, obrigacao)
      if (!payload) {
        setErroValor('Informe um valor válido (ex.: 1.118,26).')
        return
      }
    }
    setErroValor('')
    await onSave(payload)
  }

  return (
    <>
      <dialog
        open
        className="modal fade show d-block"
        style={{ zIndex: 1060 }}
        aria-modal="true"
        aria-labelledby="obrigacao-edit-modal-title"
      >
        <div className="modal-dialog modal-dialog-centered px-2">
          <form className="modal-content" onSubmit={(e) => void handleSubmit(e)}>
            <div className="modal-header">
              <h2 id="obrigacao-edit-modal-title" className="modal-title h5 mb-0">
                Editar {obrigacao.tipo_label}
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
              {dasDoPdf ? (
                <p className="text-muted small">
                  Valor, descrição e composição vêm do PDF Simples Nacional importado. Aqui você
                  pode ajustar apenas vencimento e observações; para alterar o DAS, reimporte um PDF
                  pesquisável.
                </p>
              ) : dasManual ? (
                <p className="text-muted small">
                  O PDF do DAS não pôde ser lido (escaneado ou ilegível). Informe o valor total e o
                  INSS da composição (cód. 1006) conforme o documento.
                </p>
              ) : (
                <p className="text-muted small">
                  Use quando o PDF não extraiu o valor corretamente.
                </p>
              )}
              <div className="mb-3">
                <label htmlFor="obrigacao-valor" className="form-label">
                  Valor (R$)
                </label>
                <input
                  id="obrigacao-valor"
                  type="text"
                  inputMode="decimal"
                  className={`form-control ${erroValor ? 'is-invalid' : ''}`}
                  value={form.valor}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, valor: e.target.value }))
                    if (erroValor) setErroValor('')
                  }}
                  required={!dasDoPdf}
                  readOnly={dasDoPdf}
                  disabled={dasDoPdf}
                  autoFocus={!dasDoPdf}
                />
                {erroValor && <div className="invalid-feedback">{erroValor}</div>}
              </div>
              {dasManual && (
                <div className="mb-3">
                  <label htmlFor="obrigacao-inss-1006" className="form-label">
                    INSS composição DAS — cód. 1006 (R$)
                  </label>
                  <input
                    id="obrigacao-inss-1006"
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={form.inss_1006}
                    onChange={(e) => setForm((prev) => ({ ...prev, inss_1006: e.target.value }))}
                    placeholder="Ex.: 8.008,93"
                  />
                  <div className="form-text">
                    Necessário para a conciliação INSS DAS (1006) × holerites.
                  </div>
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="obrigacao-vencimento" className="form-label">
                  Vencimento
                </label>
                <input
                  id="obrigacao-vencimento"
                  type="date"
                  className="form-control"
                  value={form.data_vencimento}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, data_vencimento: e.target.value }))
                  }
                  autoFocus={dasDoPdf}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="obrigacao-descricao" className="form-label">
                  Descrição
                </label>
                <input
                  id="obrigacao-descricao"
                  type="text"
                  className="form-control"
                  value={form.descricao}
                  onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                  maxLength={255}
                  readOnly={dasDoPdf}
                  disabled={dasDoPdf}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="obrigacao-documento" className="form-label">
                  Nº documento
                </label>
                <input
                  id="obrigacao-documento"
                  type="text"
                  className="form-control"
                  value={form.numero_documento}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, numero_documento: e.target.value }))
                  }
                  maxLength={80}
                  readOnly={dasDoPdf}
                  disabled={dasDoPdf}
                />
              </div>
              <div className="mb-0">
                <label htmlFor="obrigacao-observacoes" className="form-label">
                  Observações
                </label>
                <textarea
                  id="obrigacao-observacoes"
                  className="form-control"
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>
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
