/**
 * Formulário unificado de carga: campos comuns + blocos condicionais por tipo.
 * Calcula preview de IO e valida tensão/partida conforme projeto selecionado.
 */

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import {
  numeroFasesOptions,
  tensaoOptions,
  tipoAcionamentoResistenciaOptions,
  getTipoAcionamentoValvulaSelectOptions,
  tipoReleInterfaceValvulaOptions,
  tipoConexaoCargaPainelOptions,
  tipoCorrenteOptions,
  getTipoPartidaMotorSelectOptions,
  tipoProtecaoMotorOptions,
  tipoProtecaoResistenciaOptions,
  tipoProtecaoValvulaOptions,
  tipoSensorOptions,
  tipoSinalAnalogicoOptions,
  tipoSinalOptions,
  tipoTransdutorOptions,
  tipoValvulaOptions,
  unidadePotenciaCorrenteOptions,
} from '../constants/cargaChoiceOptions'
import { applyTipoChange, tipoCargaOptions } from '../utils/cargaFormDefaults'
import {
  calcularOcupacaoIoCarga,
  calcularSaidasDigitaisMotor,
} from '../utils/calcularIoCargaForm'
import type { CargaFormData, TipoCarga } from '../types/carga'
import { CargaFormPanelExtras } from './CargaFormPanelExtras'
import { CargaFormParametrosShell } from './CargaFormParametrosShell'
import { CargaTipoPills } from './CargaTipoPills'
import { renderCargaSelectOptions } from './renderCargaSelectOptions'

type CargaFormProps = {
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
  const colSm = isPanel
    ? 'col-6 col-lg-4 col-xl-3'
    : compact
      ? 'col-sm-6 col-lg-4'
      : 'col-md-4'
  const colMd = isPanel
    ? 'col-6 col-lg-4 col-xl-3'
    : compact
      ? 'col-sm-6 col-md-4'
      : 'col-md-4'
  const colMd6 = compact ? 'col-sm-6' : 'col-md-6'
  const colMd8 = compact ? 'col-sm-6 col-lg-8' : 'col-md-8'
  const colMd3 = isPanel
    ? 'col-6 col-lg-4 col-xl-3'
    : compact
      ? 'col-6 col-md-4 col-lg-3'
      : 'col-md-3'
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
      const { name, value, type } = t
      if (type === 'checkbox' && t instanceof HTMLInputElement) {
        setFormData((prev) => ({ ...prev, [name]: t.checked }))
        return
      }
      if (name === 'quantidade') {
        const n = Number(value)
        setFormData((prev) => ({
          ...prev,
          quantidade: Number.isFinite(n) && n >= 1 ? n : 1,
        }))
        return
      }
      if (
        name === 'quantidade_entradas_digitais' ||
        name === 'quantidade_entradas_analogicas' ||
        name === 'quantidade_saidas_digitais' ||
        name === 'quantidade_saidas_analogicas' ||
        name === 'quantidade_entradas_rapidas'
      ) {
        const n = Number(value)
        setFormData((prev) => ({
          ...prev,
          [name]: Number.isFinite(n) && n >= 0 ? n : 0,
        }))
        return
      }
      if (name === 'tipo') {
        setFormData((prev) => applyTipoChange(prev, value as TipoCarga))
        return
      }
      setFormData((prev) => ({ ...prev, [name]: value }))
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
    async (e: FormEvent<HTMLFormElement>) => {
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

  const m = formData.motor
  const tipoPartidaMotorSelectOptions = useMemo(
    () => getTipoPartidaMotorSelectOptions(m?.tipo_partida ?? ''),
    [m?.tipo_partida]
  )
  const motorMostraRendimentoFp = Boolean(m && m.potencia_corrente_unidade !== 'A')
  const motorMostraTempoPartida = Boolean(
    m &&
      (m.tipo_partida === 'ESTRELA_TRIANGULO' ||
        m.tipo_partida === 'SOFT_STARTER' ||
        m.tipo_partida === 'INVERSOR' ||
        m.tipo_partida === 'SERVO_DRIVE')
  )
  const v = formData.valvula
  const r = formData.resistencia
  const s = formData.sensor
  const t = formData.transdutor

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
              {!esconderCamposAnalogicosIo ? (
                <div className="carga-form-panel__io-row carga-form-panel__io-row--analog">
                  {ioAnalogFields.map(([name, label]) =>
                    renderIoQuantityInput(
                      name,
                      label,
                      'carga-form-panel__io-field'
                    )
                  )}
                </div>
              ) : null}
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
      {!omitSectionTitle ? (
        <div className="col-12">
          <h2 className={`${sectionTitleClass} mt-2`}>Requisitos</h2>
        </div>
      ) : null}

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
      className={
        isPanel
          ? 'carga-form carga-form--panel'
          : compact
            ? 'carga-form carga-form--compact'
            : 'carga-form'
      }
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
              <label className="form-label">Tag</label>
              <input
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
              <label className="form-label">Descrição</label>
              <input
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
              <label className="form-label">Qtd.</label>
              <input
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
        {!isPanel && !hideProjetoField ? (
          <div className={colMd6}>
            <label className="form-label">Projeto</label>
            <select
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
        ) : null}

        {!isPanel ? (
          <>
            <div className={colMd3}>
              <label className="form-label">Tipo de carga</label>
              <select
                name="tipo"
                className={selectClass}
                value={formData.tipo}
                onChange={handleBaseChange}
              >
                {renderCargaSelectOptions(tipoCargaOptions)}
              </select>
            </div>

            <div className={colMd3}>
              <label className="form-label">Quantidade</label>
              <input
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
              <label className="form-label">Tag</label>
              <input
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
              <label className="form-label">Descrição</label>
              <input
                type="text"
                name="descricao"
                className={controlClass}
                value={formData.descricao}
                onChange={handleBaseChange}
                required
              />
            </div>

            {!hideOptionalFields ? (
              <>
                <div className={colMd6}>
                  <label className="form-label">Local de instalação</label>
                  <input
                    type="text"
                    name="local_instalacao"
                    className={controlClass}
                    value={formData.local_instalacao}
                    onChange={handleBaseChange}
                    placeholder="Opcional"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Observações</label>
                  <textarea
                    name="observacoes"
                    className={controlClass}
                    rows={2}
                    value={formData.observacoes}
                    onChange={handleBaseChange}
                  />
                </div>
              </>
            ) : null}
          </>
        ) : null}

        <CargaFormParametrosShell
          isPanel={isPanel}
          title={`Parâmetros — ${tipoCargaLabel}`}
        >
        {formData.tipo === 'MOTOR' && m && (
          <>
            {tipoSectionHeader('Motor')}
            <div className="col-6 col-md-3">
              <label className="form-label">Potência / corrente (valor)</label>
              <input
                type="text"
                className={controlClass}
                value={m.potencia_corrente_valor}
                onChange={(e) =>
                  patchMotor({ potencia_corrente_valor: e.target.value })
                }
                required
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Unidade</label>
              <select
                className={selectClass}
                value={m.potencia_corrente_unidade}
                onChange={(e) =>
                  patchMotor({
                    potencia_corrente_unidade: e.target.value as 'CV' | 'KW' | 'A',
                  })
                }
              >
                {renderCargaSelectOptions(unidadePotenciaCorrenteOptions)}
              </select>
            </div>
            {motorMostraRendimentoFp && (
              <>
                <div className="col-6 col-md-3">
                  <label className="form-label">Rendimento (%)</label>
                  <input
                    type="text"
                    className={controlClass}
                    value={m.rendimento_percentual}
                    onChange={(e) =>
                      patchMotor({ rendimento_percentual: e.target.value })
                    }
                  />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label">Fator de potência</label>
                  <input
                    type="text"
                    className={controlClass}
                    value={m.fator_potencia}
                    onChange={(e) =>
                      patchMotor({ fator_potencia: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            <div className={colMd}>
              <label className="form-label">Tipo de partida</label>
              <select
                className={selectClass}
                value={m.tipo_partida}
                onChange={(e) => patchMotor({ tipo_partida: e.target.value })}
              >
                {renderCargaSelectOptions(tipoPartidaMotorSelectOptions)}
              </select>
            </div>
            <div className={compact ? 'col-12 col-md-6' : colMd}>
              <label className="form-label">Tipo de proteção</label>
              <select
                className={selectClass}
                value={m.tipo_protecao}
                onChange={(e) => patchMotor({ tipo_protecao: e.target.value })}
              >
                {renderCargaSelectOptions(tipoProtecaoMotorOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Número de fases</label>
              <select
                className={selectClass}
                value={m.numero_fases}
                onChange={(e) =>
                  patchMotor({ numero_fases: Number(e.target.value) })
                }
              >
                {renderCargaSelectOptions(numeroFasesOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Tensão do motor</label>
              <select
                className={selectClass}
                value={m.tensao_motor}
                onChange={(e) =>
                  patchMotor({ tensao_motor: Number(e.target.value) })
                }
              >
                {renderCargaSelectOptions(tensaoOptions)}
              </select>
            </div>
            <div className={compact ? 'col-12 col-md-6' : colMd}>
              <label className="form-label">Conexão ao painel</label>
              <select
                className={selectClass}
                value={m.tipo_conexao_painel}
                onChange={(e) =>
                  patchMotor({ tipo_conexao_painel: e.target.value })
                }
              >
                {renderCargaSelectOptions(tipoConexaoCargaPainelOptions)}
              </select>
            </div>
            {motorMostraTempoPartida && <div className={colMd} />}
            <div className={colMd}>
              <div className="form-check mt-4">
                <input
                  id="reversivel"
                  type="checkbox"
                  className="form-check-input"
                  checked={m.reversivel}
                  onChange={(e) => patchMotor({ reversivel: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="reversivel">
                  Reversível
                </label>
              </div>
            </div>
            <div className={colMd}>
              <div className="form-check mt-4">
                <input
                  id="freio_motor"
                  type="checkbox"
                  className="form-check-input"
                  checked={m.freio_motor}
                  onChange={(e) => patchMotor({ freio_motor: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="freio_motor">
                  Motor tem freio?
                </label>
              </div>
            </div>
          </>
        )}


        {formData.tipo === 'VALVULA' && v && (
          <>
            {tipoSectionHeader('Válvula')}
            <div className={colMd}>
              <label className="form-label">Tipo de válvula</label>
              <select
                className={selectClass}
                value={v.tipo_valvula}
                onChange={(e) => patchValvula({ tipo_valvula: e.target.value })}
              >
                {renderCargaSelectOptions(tipoValvulaOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Qtd. solenoides</label>
              <input
                type="number"
                min={1}
                className={controlClass}
                value={v.quantidade_solenoides}
                onChange={(e) =>
                  patchValvula({
                    quantidade_solenoides: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </div>
            <div className={colMd}>
              <label className="form-label">Tensão de alimentação</label>
              <select
                className={selectClass}
                value={v.tensao_alimentacao}
                onChange={(e) =>
                  patchValvula({ tensao_alimentacao: Number(e.target.value) })
                }
              >
                {renderCargaSelectOptions(tensaoOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Tipo de corrente</label>
              <select
                className={selectClass}
                value={v.tipo_corrente}
                onChange={(e) =>
                  patchValvula({ tipo_corrente: e.target.value as 'CA' | 'CC' })
                }
              >
                {renderCargaSelectOptions(tipoCorrenteOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Corrente consumida (mA)</label>
              <input
                type="text"
                className={controlClass}
                value={v.corrente_consumida_ma}
                onChange={(e) =>
                  patchValvula({ corrente_consumida_ma: e.target.value })
                }
              />
            </div>
            <div className={colMd}>
              <label className="form-label">Tipo de proteção</label>
              <select
                className={selectClass}
                value={v.tipo_protecao}
                onChange={(e) => patchValvula({ tipo_protecao: e.target.value })}
              >
                {renderCargaSelectOptions(tipoProtecaoValvulaOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Tipo de acionamento</label>
              <select
                className={selectClass}
                value={v.tipo_acionamento}
                onChange={(e) => {
                  const nv = e.target.value
                  if (nv === 'RELE_INTERFACE') {
                    patchValvula({
                      tipo_acionamento: nv,
                      tipo_rele_interface: v.tipo_rele_interface || 'ELETROMECANICA',
                    })
                  } else {
                    patchValvula({ tipo_acionamento: nv, tipo_rele_interface: '' })
                  }
                }}
              >
                {renderCargaSelectOptions(
                  getTipoAcionamentoValvulaSelectOptions(v.tipo_acionamento)
                )}
              </select>
            </div>
            {v.tipo_acionamento === 'RELE_INTERFACE' && (
              <div className={colMd}>
                <label className="form-label">Tipo de relé de interface</label>
                <select
                  className={selectClass}
                  value={v.tipo_rele_interface || 'ELETROMECANICA'}
                  onChange={(e) =>
                    patchValvula({ tipo_rele_interface: e.target.value })
                  }
                >
                  {renderCargaSelectOptions(tipoReleInterfaceValvulaOptions)}
                </select>
              </div>
            )}
            <div className={colMd}>
              <div className="form-check mt-2">
                <input
                  id="possui_feedback"
                  type="checkbox"
                  className="form-check-input"
                  checked={v.possui_feedback}
                  onChange={(e) =>
                    patchValvula({ possui_feedback: e.target.checked })
                  }
                />
                <label className="form-check-label" htmlFor="possui_feedback">
                  Possui feedback
                </label>
              </div>
            </div>
          </>
        )}

        {formData.tipo === 'RESISTENCIA' && r && (
          <>
            {tipoSectionHeader('Resistência')}
            <div className={colMd}>
              <label className="form-label">Número de fases</label>
              <select
                className={selectClass}
                value={r.numero_fases}
                onChange={(e) =>
                  patchResistencia({ numero_fases: Number(e.target.value) })
                }
              >
                {renderCargaSelectOptions(numeroFasesOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Tensão da resistência</label>
              <select
                className={selectClass}
                value={r.tensao_resistencia}
                onChange={(e) =>
                  patchResistencia({ tensao_resistencia: Number(e.target.value) })
                }
              >
                {renderCargaSelectOptions(tensaoOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Conexão ao painel</label>
              <select
                className={selectClass}
                value={r.tipo_conexao_painel}
                onChange={(e) =>
                  patchResistencia({ tipo_conexao_painel: e.target.value })
                }
              >
                {renderCargaSelectOptions(tipoConexaoCargaPainelOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Potência (kW)</label>
              <input
                type="text"
                className={controlClass}
                value={r.potencia_kw}
                onChange={(e) =>
                  patchResistencia({ potencia_kw: e.target.value })
                }
              />
            </div>
            <div className={colMd}>
              <label className="form-label">Tipo de proteção</label>
              <select
                className={selectClass}
                value={r.tipo_protecao}
                onChange={(e) => patchResistencia({ tipo_protecao: e.target.value })}
              >
                {renderCargaSelectOptions(tipoProtecaoResistenciaOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Tipo de acionamento</label>
              <select
                className={selectClass}
                value={r.tipo_acionamento}
                onChange={(e) => {
                  const nv = e.target.value
                  if (nv === 'RELE_INTERFACE') {
                    patchResistencia({
                      tipo_acionamento: nv,
                      tipo_rele_interface: r.tipo_rele_interface || 'ELETROMECANICA',
                    })
                  } else {
                    patchResistencia({ tipo_acionamento: nv, tipo_rele_interface: '' })
                  }
                }}
              >
                {renderCargaSelectOptions(tipoAcionamentoResistenciaOptions)}
              </select>
            </div>
            {r.tipo_acionamento === 'RELE_INTERFACE' && (
              <div className={colMd}>
                <label className="form-label">Tipo de relé de interface</label>
                <select
                  className={selectClass}
                  value={r.tipo_rele_interface || 'ELETROMECANICA'}
                  onChange={(e) =>
                    patchResistencia({ tipo_rele_interface: e.target.value })
                  }
                >
                  {renderCargaSelectOptions(tipoReleInterfaceValvulaOptions)}
                </select>
              </div>
            )}
          </>
        )}

        {formData.tipo === 'SENSOR' && s && (
          <>
            {tipoSectionHeader('Sensor')}
            <div className={colMd}>
              <label className="form-label">Tipo de sensor</label>
              <select
                className={selectClass}
                value={s.tipo_sensor}
                onChange={(e) => patchSensor({ tipo_sensor: e.target.value })}
              >
                {renderCargaSelectOptions(tipoSensorOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Tipo de sinal</label>
              <select
                className={selectClass}
                value={s.tipo_sinal}
                onChange={(e) => patchSensor({ tipo_sinal: e.target.value })}
              >
                {renderCargaSelectOptions(tipoSinalOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Sinal analógico</label>
              <select
                className={selectClass}
                value={s.tipo_sinal_analogico}
                onChange={(e) =>
                  patchSensor({ tipo_sinal_analogico: e.target.value })
                }
                disabled={s.tipo_sinal !== 'ANALOGICO'}
              >
                <option value="">Selecione</option>
                {renderCargaSelectOptions(tipoSinalAnalogicoOptions)}
              </select>
            </div>
            <div className={colMd3}>
              <label className="form-label">Tensão de alimentação</label>
              <select
                className={selectClass}
                value={s.tensao_alimentacao}
                onChange={(e) =>
                  patchSensor({ tensao_alimentacao: Number(e.target.value) })
                }
              >
                {renderCargaSelectOptions(tensaoOptions)}
              </select>
            </div>
            <div className={colMd3}>
              <label className="form-label">Tipo de corrente</label>
              <select
                className={selectClass}
                value={s.tipo_corrente}
                onChange={(e) =>
                  patchSensor({ tipo_corrente: e.target.value as 'CA' | 'CC' })
                }
              >
                {renderCargaSelectOptions(tipoCorrenteOptions)}
              </select>
            </div>
            <div className={colMd3}>
              <label className="form-label">Corrente consumida (mA)</label>
              <input
                type="text"
                className={controlClass}
                value={s.corrente_consumida_ma}
                onChange={(e) =>
                  patchSensor({ corrente_consumida_ma: e.target.value })
                }
              />
            </div>
            <div className={colMd3}>
              <label className="form-label">Quantidade de fios</label>
              <input
                type="number"
                min={0}
                className={controlClass}
                value={s.quantidade_fios}
                onChange={(e) =>
                  patchSensor({
                    quantidade_fios: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              />
            </div>
            {(['pnp', 'npn', 'normalmente_aberto', 'normalmente_fechado'] as const).map(
              (k) => (
                <div key={k} className="col-md-3">
                  <div className="form-check mt-2">
                    <input
                      id={k}
                      type="checkbox"
                      className="form-check-input"
                      checked={s[k]}
                      onChange={(e) => patchSensor({ [k]: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor={k}>
                      {k === 'pnp'
                        ? 'PNP'
                        : k === 'npn'
                          ? 'NPN'
                          : k === 'normalmente_aberto'
                            ? 'Normalmente aberto'
                            : 'Normalmente fechado'}
                    </label>
                  </div>
                </div>
              )
            )}
          </>
        )}

        {formData.tipo === 'TRANSDUTOR' && t && (
          <>
            {tipoSectionHeader('Transdutor')}
            <div className={colMd}>
              <label className="form-label">Tipo</label>
              <select
                className={selectClass}
                value={t.tipo_transdutor}
                onChange={(e) =>
                  patchTransdutor({ tipo_transdutor: e.target.value })
                }
              >
                {renderCargaSelectOptions(tipoTransdutorOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Sinal analógico</label>
              <select
                className={selectClass}
                value={t.tipo_sinal_analogico}
                onChange={(e) =>
                  patchTransdutor({ tipo_sinal_analogico: e.target.value })
                }
              >
                <option value="">Selecione</option>
                {renderCargaSelectOptions(tipoSinalAnalogicoOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Faixa de medição</label>
              <input
                type="text"
                className={controlClass}
                value={t.faixa_medicao}
                onChange={(e) =>
                  patchTransdutor({ faixa_medicao: e.target.value })
                }
              />
            </div>
            <div className={colMd}>
              <label className="form-label">Tensão de alimentação</label>
              <select
                className={selectClass}
                value={t.tensao_alimentacao}
                onChange={(e) =>
                  patchTransdutor({ tensao_alimentacao: Number(e.target.value) })
                }
              >
                {renderCargaSelectOptions(tensaoOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Tipo de corrente</label>
              <select
                className={selectClass}
                value={t.tipo_corrente}
                onChange={(e) =>
                  patchTransdutor({ tipo_corrente: e.target.value as 'CA' | 'CC' })
                }
              >
                {renderCargaSelectOptions(tipoCorrenteOptions)}
              </select>
            </div>
            <div className={colMd}>
              <label className="form-label">Corrente consumida (mA)</label>
              <input
                type="text"
                className={controlClass}
                value={t.corrente_consumida_ma}
                onChange={(e) =>
                  patchTransdutor({ corrente_consumida_ma: e.target.value })
                }
              />
            </div>
            <div className={colMd}>
              <label className="form-label">Quantidade de fios</label>
              <input
                type="number"
                min={0}
                className={controlClass}
                value={t.quantidade_fios}
                onChange={(e) =>
                  patchTransdutor({
                    quantidade_fios: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              />
            </div>
          </>
        )}

        {(formData.tipo === 'TRANSMISSOR' || formData.tipo === 'OUTRO') && (
          <div className="col-12">
            {!isPanel ? <hr /> : null}
            <p className="text-muted small mb-0">
              Não há parâmetros específicos adicionais para este tipo no sistema.
              {!hideOptionalFields ? ' Use observações para detalhar a carga.' : null}
            </p>
          </div>
        )}
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

      {!hideFooterSubmit ? (
        <div className="mt-4 d-flex gap-2">
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar carga'}
          </button>
        </div>
      ) : null}
    </form>
  )
}
