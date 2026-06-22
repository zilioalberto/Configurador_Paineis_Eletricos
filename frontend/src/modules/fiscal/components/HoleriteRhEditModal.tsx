import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { rhApi } from '@/modules/rh/services/rhApi'
import type { ColaboradorDto } from '@/modules/rh/types/rh'

import type {
  AtualizarHoleritePayload,
  HoleriteCompetenciaDto,
} from '../services/fiscalObrigacoesService'
import { formatMoedaInput, parseMoedaPt } from '../utils/fiscalDisplay'

type HoleriteFormState = {
  nome: string
  cpf: string
  proventos: string
  desconto_inss: string
  fgts_mes: string
  colaborador_id: string
}

function holeriteToForm(holerite: HoleriteCompetenciaDto): HoleriteFormState {
  const pendentes = holerite.valores_pendentes
  const usarPendentes = !holerite.valores_aplicados && pendentes
  return {
    nome: holerite.nome ?? '',
    cpf: holerite.cpf ?? '',
    proventos: formatMoedaInput(
      usarPendentes ? pendentes.proventos ?? '0' : holerite.proventos,
    ),
    desconto_inss: formatMoedaInput(
      usarPendentes ? pendentes.desconto_inss ?? '0' : holerite.desconto_inss,
    ),
    fgts_mes: formatMoedaInput(usarPendentes ? pendentes.fgts_mes ?? '0' : holerite.fgts_mes),
    colaborador_id:
      holerite.colaborador_id ?? holerite.colaborador_sugerido_id ?? '',
  }
}

function formToPayload(form: HoleriteFormState): AtualizarHoleritePayload | null {
  const proventos = parseMoedaPt(form.proventos)
  const descontoInss = parseMoedaPt(form.desconto_inss)
  const fgtsMes = parseMoedaPt(form.fgts_mes)
  if (!Number.isFinite(proventos) || !Number.isFinite(descontoInss) || !Number.isFinite(fgtsMes)) {
    return null
  }
  return {
    nome: form.nome.trim(),
    cpf: form.cpf.trim(),
    proventos: proventos.toFixed(2),
    desconto_inss: descontoInss.toFixed(2),
    fgts_mes: fgtsMes.toFixed(2),
    colaborador_id: form.colaborador_id || null,
  }
}

/** Modal para editar holerite e vincular colaborador do RH. */
export function HoleriteRhEditModal({
  holerite,
  isSubmitting,
  isCreatingColaborador,
  onClose,
  onSave,
  onCriarColaborador,
}: Readonly<{
  holerite: HoleriteCompetenciaDto
  isSubmitting: boolean
  isCreatingColaborador: boolean
  onClose: () => void
  onSave: (payload: AtualizarHoleritePayload) => Promise<void>
  onCriarColaborador: () => Promise<void>
}>) {
  const [form, setForm] = useState<HoleriteFormState>(() => holeriteToForm(holerite))
  const [colaboradores, setColaboradores] = useState<ColaboradorDto[]>([])
  const [erroForm, setErroForm] = useState('')

  useEffect(() => {
    setForm(holeriteToForm(holerite))
    setErroForm('')
  }, [holerite])

  useEffect(() => {
    void rhApi.listarColaboradores({ ativo: '1' }).then(setColaboradores)
  }, [])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmitting && !isCreatingColaborador) {
        onClose()
      }
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [isCreatingColaborador, isSubmitting, onClose])

  const colaboradoresOrdenados = useMemo(
    () => [...colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [colaboradores],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.colaborador_id) {
      setErroForm('Selecione o colaborador cadastrado no RH para aplicar os valores.')
      return
    }
    const payload = formToPayload(form)
    if (!payload) {
      setErroForm('Verifique os valores monetários informados.')
      return
    }
    setErroForm('')
    await onSave(payload)
  }

  return (
    <>
      <dialog
        open
        className="modal fade show d-block"
        style={{ zIndex: 1060 }}
        aria-modal="true"
        aria-labelledby="holerite-edit-modal-title"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg px-2">
          <form className="modal-content" onSubmit={(e) => void handleSubmit(e)}>
            <div className="modal-header">
              <h2 id="holerite-edit-modal-title" className="modal-title h5 mb-0">
                Holerite — {holerite.nome}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting || isCreatingColaborador}
                aria-label="Fechar"
              />
            </div>
            <div className="modal-body">
              <p className="text-muted small">
                Selecione o colaborador correto do{' '}
                <Link to="/erp/rh" target="_blank">
                  módulo RH
                </Link>
                . Os valores do PDF só entram na conciliação após salvar o vínculo.
              </p>
              {holerite.aviso_rh && (
                <div className="alert alert-warning py-2 small mb-3">{holerite.aviso_rh}</div>
              )}
              {holerite.colaborador_sugerido_nome && !holerite.colaborador_id && (
                <div className="alert alert-info py-2 small mb-3">
                  Sugestão automática: <strong>{holerite.colaborador_sugerido_nome}</strong>
                </div>
              )}
              {erroForm && <div className="alert alert-danger py-2">{erroForm}</div>}
              <div className="row g-3">
                <div className="col-md-8">
                  <label htmlFor="holerite-nome" className="form-label">
                    Nome no holerite
                  </label>
                  <input
                    id="holerite-nome"
                    type="text"
                    className="form-control"
                    value={form.nome}
                    onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="holerite-cpf" className="form-label">
                    CPF
                  </label>
                  <input
                    id="holerite-cpf"
                    type="text"
                    className="form-control"
                    value={form.cpf}
                    onChange={(e) => setForm((prev) => ({ ...prev, cpf: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="holerite-colaborador" className="form-label">
                    Colaborador RH
                  </label>
                  <select
                    id="holerite-colaborador"
                    className="form-select"
                    value={form.colaborador_id}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, colaborador_id: e.target.value }))
                    }
                  >
                    <option value="">— Sem vínculo —</option>
                    {colaboradoresOrdenados.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.matricula})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="holerite-proventos" className="form-label">
                    Proventos
                  </label>
                  <input
                    id="holerite-proventos"
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={form.proventos}
                    onChange={(e) => setForm((prev) => ({ ...prev, proventos: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="holerite-inss" className="form-label">
                    INSS
                  </label>
                  <input
                    id="holerite-inss"
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={form.desconto_inss}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, desconto_inss: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="holerite-fgts" className="form-label">
                    FGTS
                  </label>
                  <input
                    id="holerite-fgts"
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={form.fgts_mes}
                    onChange={(e) => setForm((prev) => ({ ...prev, fgts_mes: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={isSubmitting || isCreatingColaborador || Boolean(form.colaborador_id)}
                onClick={() => void onCriarColaborador()}
              >
                {isCreatingColaborador ? 'Criando…' : 'Criar no RH'}
              </button>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={isSubmitting || isCreatingColaborador}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || isCreatingColaborador}
                >
                  {isSubmitting ? 'Salvando…' : 'Salvar vínculo'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </dialog>
      <button
        type="button"
        className="modal-backdrop fade show"
        style={{ zIndex: 1055 }}
        aria-label="Fechar"
        disabled={isSubmitting || isCreatingColaborador}
        onClick={onClose}
      />
    </>
  )
}
