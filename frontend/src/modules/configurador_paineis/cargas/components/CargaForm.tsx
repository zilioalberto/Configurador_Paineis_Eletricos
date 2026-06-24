/**
 * Formulário unificado de carga: campos comuns + blocos condicionais por tipo.
 * Calcula preview de IO e valida tensão/partida conforme projeto selecionado.
 */

import {
  type ChangeEvent,
  type SyntheticEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import { applyTipoChange, tipoCargaOptions } from '../utils/cargaFormDefaults'
import {
  calcularOcupacaoIoCarga,
  calcularSaidasDigitaisMotor,
} from '../utils/calcularIoCargaForm'
import type { CargaFormData, TipoCarga } from '../types/carga'
import { CargaFormPanelExtras } from './CargaFormPanelExtras'
import { CargaFormParametrosShell } from './CargaFormParametrosShell'
import { CargaParametrosPorTipo } from './CargaParametrosPorTipo'
import { CargaTipoPills } from './CargaTipoPills'
import { renderCargaSelectOptions } from './renderCargaSelectOptions'

type CargaFormProps = Readonly<{
  projetos: Projeto[]
  onSubmit: (data: CargaFormData) => Promise<void>
  onChange?: (data: CargaFormData) => void
  loading?: boolean
  initialData: CargaFormData
  suggestedTag?: string
  /** Se true, não permite trocar o projeto (edição). */
  lockProjeto?: boolean
  /** Oculta o campo e o título de projeto (cadastro via modal na listagem). */
  hideProjetoField?: boolean
  /** `panel`: drawer lateral com seções e campos opcionais recolhidos. */
  layout?: 'default' | 'compact' | 'panel'
  formId?: string
  /** Oculta o botão Salvar no rodapé (submit externo no modal). */
  hideFooterSubmit?: boolean
  /** Oculta local/observações (ex.: drawer com bloco opcional separado). */
  hideOptionalFields?: boolean
}>

function gridColSm(isPanel: boolean, compact: boolean): string {
  if (isPanel) return 'col-6 col-lg-4 col-xl-3'
  if (compact) return 'col-sm-6 col-lg-4'
  return 'col-md-4'
}

function classeFormularioCarga(isPanel: boolean, compact: boolean): string {
  if (isPanel) return 'carga-form carga-form--panel'
  if (compact) return 'carga-form carga-form--compact'
  return 'carga-form'
}

function gridColMd(isPanel: boolean, compact: boolean): string {
  if (isPanel) return 'col-6 col-lg-4 col-xl-3'
  if (compact) return 'col-sm-6 col-md-4'
  return 'col-md-4'
}

function gridColMd3(isPanel: boolean, compact: boolean): string {
  if (isPanel) return 'col-6 col-lg-4 col-xl-3'
  if (compact) return 'col-6 col-md-4 col-lg-3'
  return 'col-md-3'
}

const CAMPOS_QUANTIDADE_IO = new Set([
  'quantidade_entradas_digitais',
  'quantidade_entradas_analogicas',
  'quantidade_saidas_digitais',
  'quantidade_saidas_analogicas',
  'quantidade_entradas_rapidas',
])

type MudancaCampoCarga = {
  name: string
  value: string
  type: string
  checked: boolean
}

/** Aplica a alteração de um campo base do formulário sobre o estado anterior. */
function aplicarMudancaCampoCarga(
  prev: CargaFormData,
  { name, value, type, checked }: MudancaCampoCarga
): CargaFormData {
  if (type === 'checkbox') {
    return { ...prev, [name]: checked }
  }
  if (name === 'quantidade') {
    const n = Number(value)
    return { ...prev, quantidade: Number.isFinite(n) && n >= 1 ? n : 1 }
  }
  if (CAMPOS_QUANTIDADE_IO.has(name)) {
    const n = Number(value)
    return { ...prev, [name]: Number.isFinite(n) && n >= 0 ? n : 0 }
  }
  if (name === 'tipo') {
    return applyTipoChange(prev, value as TipoCarga)
  }
  return { ...prev, [name]: value }
}

export default function CargaForm({
  projetos,
  onSubmit,
  onChange,
  loading = false,
  initialData,
  suggestedTag,
  lockProjeto = false,
  hideProjetoField = false,
  layout = 'default',
  formId,
  hideFooterSubmit = false,
  hideOptionalFields = false,
}: CargaFormProps) {
  const compact = layout === 'compact' || layout === 'panel'
  const isPanel = layout === 'panel'
  const colSm = gridColSm(isPanel, compact)
  const colMd = gridColMd(isPanel, compact)
  const colMd6 = compact ? 'col-sm-6' : 'col-md-6'
  const colMd8 = compact ? 'col-sm-6 col-lg-8' : 'col-md-8'
  const colMd3 = gridColMd3(isPanel, compact)
  const sectionTitleClass = compact ? 'h6 text-muted mb-0' : 'h5'
  const rowGap = compact ? 'g-2' : 'g-3'
  const [formData, setFormData] = useState<CargaFormData>(initialData)
  const [lastAutoTag, setLastAutoTag] = useState('')

  useEffect(() => {
    setFormData(initialData)
    setLastAutoTag(initialData.tag)
  }, [initialData])

  useEffect(() => {
    onChange?.(formData)
  }, [formData, onChange])

  useEffect(() => {
    if (!suggestedTag) return
    if (formData.tag === suggestedTag) return
    if (formData.tag.trim() && formData.tag !== lastAutoTag) return
    setFormData((prev) => ({ ...prev, tag: suggestedTag }))
    setLastAutoTag(suggestedTag)
  }, [formData.tag, lastAutoTag, suggestedTag])

  const projetoSelecionado = useMemo(
    () => projetos.find((p) => p.id === formData.projeto),
    [projetos, formData.projeto]
  )
  const mostrarOcupacaoIo = projetoSelecionado?.possui_plc === true
  const esconderCamposAnalogicosIo =
    mostrarOcupacaoIo &&
    formData.tipo === 'MOTOR' &&
    (formData.motor?.tipo_partida === 'DIRETA' ||
      formData.motor?.tipo_partida === 'ESTRELA_TRIANGULO')
  const desabilitarQuantidadesIo = !mostrarOcupacaoIo || !formData.exige_comando

  useEffect(() => {
    if (!formData.projeto) return
    const p = projetos.find((x) => x.id === formData.projeto)
    if (p && !p.possui_plc) {
      setFormData((prev) => ({
        ...prev,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
      }))
    }
  }, [formData.projeto, projetos])

  useEffect(() => {
    if (!mostrarOcupacaoIo) {
      setFormData((prev) => ({
        ...prev,
        ...calcularOcupacaoIoCarga({ ...prev, exige_comando: false }),
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      ...calcularOcupacaoIoCarga(prev, calcularSaidasDigitaisMotor),
    }))
  }, [
    mostrarOcupacaoIo,
    formData.exige_comando,
    formData.tipo,
    formData.motor,
    formData.valvula,
    formData.resistencia,
    formData.sensor,
    formData.transdutor,
  ])

  const handleBaseChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const t = e.target
      const checked = t instanceof HTMLInputElement ? t.checked : false
      setFormData((prev) =>
        aplicarMudancaCampoCarga(prev, {
          name: t.name,
          value: t.value,
          type: t.type,
          checked,
        })
      )
    },
    []
  )

  const patchMotor = useCallback((patch: Partial<NonNullable<CargaFormData['motor']>>) => {
    setFormData((prev) =>
      prev.motor ? { ...prev, motor: { ...prev.motor, ...patch } } : prev
    )
  }, [])

  const patchValvula = useCallback(
    (patch: Partial<NonNullable<CargaFormData['valvula']>>) => {
      setFormData((prev) =>
        prev.valvula ? { ...prev, valvula: { ...prev.valvula, ...patch } } : prev
      )
    },
    []
  )

  const patchResistencia = useCallback(
    (patch: Partial<NonNullable<CargaFormData['resistencia']>>) => {
      setFormData((prev) =>
        prev.resistencia
          ? { ...prev, resistencia: { ...prev.resistencia, ...patch } }
          : prev
      )
    },
    []
  )

  const patchSensor = useCallback(
    (patch: Partial<NonNullable<CargaFormData['sensor']>>) => {
      setFormData((prev) =>
        prev.sensor ? { ...prev, sensor: { ...prev.sensor, ...patch } } : prev
      )
    },
    []
  )

  const patchTransdutor = useCallback(
    (patch: Partial<NonNullable<CargaFormData['transdutor']>>) => {
      setFormData((prev) =>
        prev.transdutor
          ? { ...prev, transdutor: { ...prev.transdutor, ...patch } }
          : prev
      )
    },
    []
  )

  const handleFormKeyDown = useCallback((e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return
    if (e.target instanceof HTMLTextAreaElement) return
    e.preventDefault()
  }, [])

  const handleSubmit = useCallback(
    async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault()
      await onSubmit(formData)
    },
    [formData, onSubmit]
  )

  const handleTipoSelect = useCallback((tipo: TipoCarga) => {
    setFormData((prev) => applyTipoChange(prev, tipo))
  }, [])

  const tipoCargaLabel =
    tipoCargaOptions.find((o) => o.value === formData.tipo)?.label ?? formData.tipo

  const exibirRequisitosIo = mostrarOcupacaoIo

  const renderIoQuantityInput = (name: keyof CargaFormData, label: string, className?: string) => (
    <div key={name} className={className}>
      <label className="form-label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        className={`form-control${compact ? ' form-control-sm' : ''}`}
        value={Number(formData[name] ?? 0)}
        onChange={handleBaseChange}
        disabled={desabilitarQuantidadesIo}
      />
    </div>
  )

  const renderRequisitosPanel = () => {
    if (!exibirRequisitosIo) return null

    const ioDigitalFields = [
      ['quantidade_entradas_digitais', 'Entradas digitais'],
      ['quantidade_saidas_digitais', 'Saídas digitais'],
      ['quantidade_entradas_rapidas', 'Entradas rápidas'],
    ] as const

    const ioAnalogFields = [
      ['quantidade_entradas_analogicas', 'Entradas analógicas'],
      ['quantidade_saidas_analogicas', 'Saídas analógicas'],
    ] as const

    return (
      <details className="carga-form-panel__details" open>
        <summary className="carga-form-panel__summary">Requisitos e I/O</summary>
        <div className="carga-form-panel__details-body">
          <div className="carga-form-panel__checks">
            {(
              [['exige_comando', 'Exige comando']] as const
            ).map(([name, label]) => (
              <div key={name} className="form-check mb-0">
                <input
                  id={`panel-${name}`}
                  name={name}
                  type="checkbox"
                  className="form-check-input"
                  checked={Boolean(formData[name])}
                  onChange={handleBaseChange}
                />
                <label className="form-check-label" htmlFor={`panel-${name}`}>
                  {label}
                </label>
              </div>
            ))}
          </div>

          {mostrarOcupacaoIo ? (
            <>
              <h3 className="carga-form-panel__io-heading">Ocupação de I/O (projeto com PLC)</h3>
              <div className="carga-form-panel__io-row">
                {ioDigitalFields.map(([name, label]) =>
                  renderIoQuantityInput(
                    name,
                    label,
                    'carga-form-panel__io-field'
                  )
                )}
              </div>
              {esconderCamposAnalogicosIo ? null : (
                <div className="carga-form-panel__io-row carga-form-panel__io-row--analog">
                  {ioAnalogFields.map(([name, label]) =>
                    renderIoQuantityInput(
                      name,
                      label,
                      'carga-form-panel__io-field'
                    )
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </details>
    )
  }

  const renderRequisitosSection = (omitSectionTitle = false) => {
    if (!exibirRequisitosIo) return null

    return (
    <>
      {omitSectionTitle ? null : (
        <div className="col-12">
          <h2 className={`${sectionTitleClass} mt-2`}>Requisitos</h2>
        </div>
      )}

      {(
        [['exige_comando', 'Exige comando']] as const
      ).map(([name, label]) => (
        <div key={name} className={colMd}>
          <div className="form-check">
            <input
              id={name}
              name={name}
              type="checkbox"
              className="form-check-input"
              checked={Boolean(formData[name as keyof CargaFormData])}
              onChange={handleBaseChange}
            />
            <label className="form-check-label" htmlFor={name}>
              {label}
            </label>
          </div>
        </div>
      ))}

      {mostrarOcupacaoIo && (
        <>
          <div className="col-12 mt-1">
            <h3 className="small text-muted mb-0 fw-semibold">
              Ocupação de I/O (projeto com PLC)
            </h3>
          </div>
          {(
            [
              ['quantidade_entradas_digitais', 'Entradas digitais'],
              ['quantidade_entradas_analogicas', 'Entradas analógicas'],
              ['quantidade_saidas_digitais', 'Saídas digitais'],
              ['quantidade_saidas_analogicas', 'Saídas analógicas'],
              ['quantidade_entradas_rapidas', 'Entradas rápidas'],
            ] as const
          )
            .filter(([name]) => {
              if (!esconderCamposAnalogicosIo) return true
              return (
                name !== 'quantidade_entradas_analogicas' &&
                name !== 'quantidade_saidas_analogicas'
              )
            })
            .map(([name, label]) =>
              renderIoQuantityInput(name as keyof CargaFormData, label, colSm)
            )}
        </>
      )}
    </>
    )
  }

  const controlClass = compact ? 'form-control form-control-sm' : 'form-control'
  const selectClass = compact ? 'form-select form-select-sm' : 'form-select'

  const tipoSectionHeader = (title: string) =>
    isPanel ? null : (
      <div className="col-12">
        <hr className="my-2" />
        <h2 className={sectionTitleClass}>{title}</h2>
      </div>
    )

  return (
    <form
      id={formId}
      className={classeFormularioCarga(isPanel, compact)}
      onSubmit={(e) => void handleSubmit(e)}
      onKeyDown={handleFormKeyDown}
    >
      {hideProjetoField ? <input type="hidden" name="projeto" value={formData.projeto} /> : null}

      {isPanel ? (
        <section className="carga-form-panel__card carga-form-panel__ident">
          <h3 className="carga-form-panel__title">Identificação</h3>
          <CargaTipoPills value={formData.tipo} onSelect={handleTipoSelect} />
          <div className="carga-form-panel__ident-fields mt-2">
            <div>
              <label className="form-label" htmlFor="cform-f1">Tag</label>
              <input id="cform-f1"
                type="text"
                name="tag"
                className={controlClass}
                value={formData.tag}
                onChange={handleBaseChange}
                required
                placeholder="M01"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="cform-f2">Descrição</label>
              <input id="cform-f2"
                type="text"
                name="descricao"
                className={controlClass}
                value={formData.descricao}
                onChange={handleBaseChange}
                required
                placeholder="Nome da carga"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="cform-f3">Qtd.</label>
              <input id="cform-f3"
                type="number"
                name="quantidade"
                className={controlClass}
                min={1}
                value={formData.quantidade}
                onChange={handleBaseChange}
                required
              />
            </div>
          </div>
        </section>
      ) : null}

      <div className={isPanel ? 'carga-form-panel__grid' : `row ${rowGap}`}>
        {isPanel || hideProjetoField ? null : (
          <div className={colMd6}>
            <label className="form-label" htmlFor="cform-f4">Projeto</label>
            <select id="cform-f4"
              name="projeto"
              className={selectClass}
              value={formData.projeto}
              onChange={handleBaseChange}
              required
              disabled={lockProjeto}
            >
              <option value="">Selecione o projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {isPanel ? null : (
          <>
            <div className={colMd3}>
              <label className="form-label" htmlFor="cform-f5">Tipo de carga</label>
              <select id="cform-f5"
                name="tipo"
                className={selectClass}
                value={formData.tipo}
                onChange={handleBaseChange}
              >
                {renderCargaSelectOptions(tipoCargaOptions)}
              </select>
            </div>

            <div className={colMd3}>
              <label className="form-label" htmlFor="cform-f6">Quantidade</label>
              <input id="cform-f6"
                type="number"
                name="quantidade"
                className={controlClass}
                min={1}
                value={formData.quantidade}
                onChange={handleBaseChange}
                required
              />
            </div>

            <div className={colMd}>
              <label className="form-label" htmlFor="cform-f7">Tag</label>
              <input id="cform-f7"
                type="text"
                name="tag"
                className={controlClass}
                value={formData.tag}
                onChange={handleBaseChange}
                required
                placeholder="Ex.: M01, YV01"
              />
            </div>

            <div className={colMd8}>
              <label className="form-label" htmlFor="carga-descricao">
                Descrição
              </label>
              <input
                id="carga-descricao"
                type="text"
                name="descricao"
                className={controlClass}
                value={formData.descricao}
                onChange={handleBaseChange}
                required
              />
            </div>

            {hideOptionalFields ? null : (
              <>
                <div className={colMd6}>
                  <label className="form-label" htmlFor="cform-f8">Local de instalação</label>
                  <input id="cform-f8"
                    type="text"
                    name="local_instalacao"
                    className={controlClass}
                    value={formData.local_instalacao}
                    onChange={handleBaseChange}
                    placeholder="Opcional"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="cform-f9">Observações</label>
                  <textarea id="cform-f9"
                    name="observacoes"
                    className={controlClass}
                    rows={2}
                    value={formData.observacoes}
                    onChange={handleBaseChange}
                  />
                </div>
              </>
            )}
          </>
        )}

        <CargaFormParametrosShell
          isPanel={isPanel}
          title={`Parâmetros — ${tipoCargaLabel}`}
        >
        <CargaParametrosPorTipo
          formData={formData}
          classes={{ colMd, colMd3, compact, controlClass, selectClass, isPanel }}
          hideOptionalFields={hideOptionalFields}
          renderSectionHeader={tipoSectionHeader}
          patchMotor={patchMotor}
          patchValvula={patchValvula}
          patchResistencia={patchResistencia}
          patchSensor={patchSensor}
          patchTransdutor={patchTransdutor}
        />
        </CargaFormParametrosShell>

        {isPanel ? (
          <div className="carga-form-panel__aside">{renderRequisitosPanel()}</div>
        ) : (
          renderRequisitosSection()
        )}
      </div>

      {isPanel && hideOptionalFields ? (
        <div className="carga-form-panel__footer">
          <CargaFormPanelExtras
            formData={formData}
            onChange={handleBaseChange}
            controlClass={controlClass}
          />
        </div>
      ) : null}

      {hideFooterSubmit ? null : (
        <div className="mt-4 d-flex gap-2">
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar carga'}
          </button>
        </div>
      )}
    </form>
  )
}
