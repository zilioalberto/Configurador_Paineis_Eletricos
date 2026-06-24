/**
 * Blocos de parâmetros específicos por tipo de carga, extraídos do `CargaForm`
 * para manter a complexidade do formulário principal sob controle.
 */
import type { ReactNode } from 'react'

import type { CargaFormData } from '../types/carga'
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
import { renderCargaSelectOptions } from './renderCargaSelectOptions'

type Motor = NonNullable<CargaFormData['motor']>
type Valvula = NonNullable<CargaFormData['valvula']>
type Resistencia = NonNullable<CargaFormData['resistencia']>
type Sensor = NonNullable<CargaFormData['sensor']>
type Transdutor = NonNullable<CargaFormData['transdutor']>

type ClassesCarga = {
  colMd: string
  colMd3: string
  compact: boolean
  controlClass: string
  selectClass: string
  isPanel: boolean
}

const ROTULO_SENSOR_CHECK: Record<string, string> = {
  pnp: 'PNP',
  npn: 'NPN',
  normalmente_aberto: 'Normalmente aberto',
  normalmente_fechado: 'Normalmente fechado',
}

type MotorParametrosProps = Readonly<{
  m: Motor
  classes: ClassesCarga
  header: ReactNode
  onPatch: (patch: Partial<Motor>) => void
}>

function MotorParametros({ m, classes, header, onPatch }: MotorParametrosProps) {
  const { colMd, compact, controlClass, selectClass } = classes
  const mostraRendimentoFp = m.potencia_corrente_unidade !== 'A'
  const mostraTempoPartida =
    m.tipo_partida === 'ESTRELA_TRIANGULO' ||
    m.tipo_partida === 'SOFT_STARTER' ||
    m.tipo_partida === 'INVERSOR' ||
    m.tipo_partida === 'SERVO_DRIVE'
  const partidaOptions = getTipoPartidaMotorSelectOptions(m.tipo_partida ?? '')
  return (
    <>
      {header}
      <div className="col-6 col-md-3">
        <label className="form-label" htmlFor="cparam-f1">Potência / corrente (valor)</label>
        <input id="cparam-f1"
          type="text"
          className={controlClass}
          value={m.potencia_corrente_valor}
          onChange={(e) => onPatch({ potencia_corrente_valor: e.target.value })}
          required
        />
      </div>
      <div className="col-6 col-md-3">
        <label className="form-label" htmlFor="cparam-f2">Unidade</label>
        <select id="cparam-f2"
          className={selectClass}
          value={m.potencia_corrente_unidade}
          onChange={(e) =>
            onPatch({ potencia_corrente_unidade: e.target.value as 'CV' | 'KW' | 'A' })
          }
        >
          {renderCargaSelectOptions(unidadePotenciaCorrenteOptions)}
        </select>
      </div>
      {mostraRendimentoFp ? (
        <>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="cparam-f3">Rendimento (%)</label>
            <input id="cparam-f3"
              type="text"
              className={controlClass}
              value={m.rendimento_percentual}
              onChange={(e) => onPatch({ rendimento_percentual: e.target.value })}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="cparam-f4">Fator de potência</label>
            <input id="cparam-f4"
              type="text"
              className={controlClass}
              value={m.fator_potencia}
              onChange={(e) => onPatch({ fator_potencia: e.target.value })}
            />
          </div>
        </>
      ) : null}
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f5">Tipo de partida</label>
        <select id="cparam-f5"
          className={selectClass}
          value={m.tipo_partida}
          onChange={(e) => onPatch({ tipo_partida: e.target.value })}
        >
          {renderCargaSelectOptions(partidaOptions)}
        </select>
      </div>
      <div className={compact ? 'col-12 col-md-6' : colMd}>
        <label className="form-label" htmlFor="cparam-f6">Tipo de proteção</label>
        <select id="cparam-f6"
          className={selectClass}
          value={m.tipo_protecao}
          onChange={(e) => onPatch({ tipo_protecao: e.target.value })}
        >
          {renderCargaSelectOptions(tipoProtecaoMotorOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f7">Número de fases</label>
        <select id="cparam-f7"
          className={selectClass}
          value={m.numero_fases}
          onChange={(e) => onPatch({ numero_fases: Number(e.target.value) })}
        >
          {renderCargaSelectOptions(numeroFasesOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f8">Tensão do motor</label>
        <select id="cparam-f8"
          className={selectClass}
          value={m.tensao_motor}
          onChange={(e) => onPatch({ tensao_motor: Number(e.target.value) })}
        >
          {renderCargaSelectOptions(tensaoOptions)}
        </select>
      </div>
      <div className={compact ? 'col-12 col-md-6' : colMd}>
        <label className="form-label" htmlFor="cparam-f9">Conexão ao painel</label>
        <select id="cparam-f9"
          className={selectClass}
          value={m.tipo_conexao_painel}
          onChange={(e) => onPatch({ tipo_conexao_painel: e.target.value })}
        >
          {renderCargaSelectOptions(tipoConexaoCargaPainelOptions)}
        </select>
      </div>
      {mostraTempoPartida ? <div className={colMd} /> : null}
      <div className={colMd}>
        <div className="form-check mt-4">
          <input
            id="reversivel"
            type="checkbox"
            className="form-check-input"
            checked={m.reversivel}
            onChange={(e) => onPatch({ reversivel: e.target.checked })}
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
            onChange={(e) => onPatch({ freio_motor: e.target.checked })}
          />
          <label className="form-check-label" htmlFor="freio_motor">
            Motor tem freio?
          </label>
        </div>
      </div>
    </>
  )
}

type ValvulaParametrosProps = Readonly<{
  v: Valvula
  classes: ClassesCarga
  header: ReactNode
  onPatch: (patch: Partial<Valvula>) => void
}>

function ValvulaParametros({ v, classes, header, onPatch }: ValvulaParametrosProps) {
  const { colMd, controlClass, selectClass } = classes
  const ehReleInterface = v.tipo_acionamento === 'RELE_INTERFACE'
  return (
    <>
      {header}
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f10">Tipo de válvula</label>
        <select id="cparam-f10"
          className={selectClass}
          value={v.tipo_valvula}
          onChange={(e) => onPatch({ tipo_valvula: e.target.value })}
        >
          {renderCargaSelectOptions(tipoValvulaOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f11">Qtd. solenoides</label>
        <input id="cparam-f11"
          type="number"
          min={1}
          className={controlClass}
          value={v.quantidade_solenoides}
          onChange={(e) =>
            onPatch({ quantidade_solenoides: Math.max(1, Number(e.target.value) || 1) })
          }
        />
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f12">Tensão de alimentação</label>
        <select id="cparam-f12"
          className={selectClass}
          value={v.tensao_alimentacao}
          onChange={(e) => onPatch({ tensao_alimentacao: Number(e.target.value) })}
        >
          {renderCargaSelectOptions(tensaoOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f13">Tipo de corrente</label>
        <select id="cparam-f13"
          className={selectClass}
          value={v.tipo_corrente}
          onChange={(e) => onPatch({ tipo_corrente: e.target.value as 'CA' | 'CC' })}
        >
          {renderCargaSelectOptions(tipoCorrenteOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f14">Corrente consumida (mA)</label>
        <input id="cparam-f14"
          type="text"
          className={controlClass}
          value={v.corrente_consumida_ma}
          onChange={(e) => onPatch({ corrente_consumida_ma: e.target.value })}
        />
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f15">Tipo de proteção</label>
        <select id="cparam-f15"
          className={selectClass}
          value={v.tipo_protecao}
          onChange={(e) => onPatch({ tipo_protecao: e.target.value })}
        >
          {renderCargaSelectOptions(tipoProtecaoValvulaOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f16">Tipo de acionamento</label>
        <select id="cparam-f16"
          className={selectClass}
          value={v.tipo_acionamento}
          onChange={(e) => {
            const nv = e.target.value
            const releAtual = v.tipo_rele_interface || 'ELETROMECANICA'
            onPatch({
              tipo_acionamento: nv,
              tipo_rele_interface: nv === 'RELE_INTERFACE' ? releAtual : '',
            })
          }}
        >
          {renderCargaSelectOptions(getTipoAcionamentoValvulaSelectOptions(v.tipo_acionamento))}
        </select>
      </div>
      {ehReleInterface ? (
        <div className={colMd}>
          <label className="form-label" htmlFor="cparam-f17">Tipo de relé de interface</label>
          <select id="cparam-f17"
            className={selectClass}
            value={v.tipo_rele_interface || 'ELETROMECANICA'}
            onChange={(e) => onPatch({ tipo_rele_interface: e.target.value })}
          >
            {renderCargaSelectOptions(tipoReleInterfaceValvulaOptions)}
          </select>
        </div>
      ) : null}
      <div className={colMd}>
        <div className="form-check mt-2">
          <input
            id="possui_feedback"
            type="checkbox"
            className="form-check-input"
            checked={v.possui_feedback}
            onChange={(e) => onPatch({ possui_feedback: e.target.checked })}
          />
          <label className="form-check-label" htmlFor="possui_feedback">
            Possui feedback
          </label>
        </div>
      </div>
    </>
  )
}

type ResistenciaParametrosProps = Readonly<{
  r: Resistencia
  classes: ClassesCarga
  header: ReactNode
  onPatch: (patch: Partial<Resistencia>) => void
}>

function ResistenciaParametros({ r, classes, header, onPatch }: ResistenciaParametrosProps) {
  const { colMd, controlClass, selectClass } = classes
  const ehReleInterface = r.tipo_acionamento === 'RELE_INTERFACE'
  return (
    <>
      {header}
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f18">Número de fases</label>
        <select id="cparam-f18"
          className={selectClass}
          value={r.numero_fases}
          onChange={(e) => onPatch({ numero_fases: Number(e.target.value) })}
        >
          {renderCargaSelectOptions(numeroFasesOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f19">Tensão da resistência</label>
        <select id="cparam-f19"
          className={selectClass}
          value={r.tensao_resistencia}
          onChange={(e) => onPatch({ tensao_resistencia: Number(e.target.value) })}
        >
          {renderCargaSelectOptions(tensaoOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f20">Conexão ao painel</label>
        <select id="cparam-f20"
          className={selectClass}
          value={r.tipo_conexao_painel}
          onChange={(e) => onPatch({ tipo_conexao_painel: e.target.value })}
        >
          {renderCargaSelectOptions(tipoConexaoCargaPainelOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f21">Potência (kW)</label>
        <input id="cparam-f21"
          type="text"
          className={controlClass}
          value={r.potencia_kw}
          onChange={(e) => onPatch({ potencia_kw: e.target.value })}
        />
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f22">Tipo de proteção</label>
        <select id="cparam-f22"
          className={selectClass}
          value={r.tipo_protecao}
          onChange={(e) => onPatch({ tipo_protecao: e.target.value })}
        >
          {renderCargaSelectOptions(tipoProtecaoResistenciaOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f23">Tipo de acionamento</label>
        <select id="cparam-f23"
          className={selectClass}
          value={r.tipo_acionamento}
          onChange={(e) => {
            const nv = e.target.value
            const releAtual = r.tipo_rele_interface || 'ELETROMECANICA'
            onPatch({
              tipo_acionamento: nv,
              tipo_rele_interface: nv === 'RELE_INTERFACE' ? releAtual : '',
            })
          }}
        >
          {renderCargaSelectOptions(tipoAcionamentoResistenciaOptions)}
        </select>
      </div>
      {ehReleInterface ? (
        <div className={colMd}>
          <label className="form-label" htmlFor="cparam-f24">Tipo de relé de interface</label>
          <select id="cparam-f24"
            className={selectClass}
            value={r.tipo_rele_interface || 'ELETROMECANICA'}
            onChange={(e) => onPatch({ tipo_rele_interface: e.target.value })}
          >
            {renderCargaSelectOptions(tipoReleInterfaceValvulaOptions)}
          </select>
        </div>
      ) : null}
    </>
  )
}

type SensorParametrosProps = Readonly<{
  s: Sensor
  classes: ClassesCarga
  header: ReactNode
  onPatch: (patch: Partial<Sensor>) => void
}>

function SensorParametros({ s, classes, header, onPatch }: SensorParametrosProps) {
  const { colMd, colMd3, controlClass, selectClass } = classes
  const sensorChecks = ['pnp', 'npn', 'normalmente_aberto', 'normalmente_fechado'] as const
  return (
    <>
      {header}
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f25">Tipo de sensor</label>
        <select id="cparam-f25"
          className={selectClass}
          value={s.tipo_sensor}
          onChange={(e) => onPatch({ tipo_sensor: e.target.value })}
        >
          {renderCargaSelectOptions(tipoSensorOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f26">Tipo de sinal</label>
        <select id="cparam-f26"
          className={selectClass}
          value={s.tipo_sinal}
          onChange={(e) => onPatch({ tipo_sinal: e.target.value })}
        >
          {renderCargaSelectOptions(tipoSinalOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f27">Sinal analógico</label>
        <select id="cparam-f27"
          className={selectClass}
          value={s.tipo_sinal_analogico}
          onChange={(e) => onPatch({ tipo_sinal_analogico: e.target.value })}
          disabled={s.tipo_sinal !== 'ANALOGICO'}
        >
          <option value="">Selecione</option>
          {renderCargaSelectOptions(tipoSinalAnalogicoOptions)}
        </select>
      </div>
      <div className={colMd3}>
        <label className="form-label" htmlFor="cparam-f28">Tensão de alimentação</label>
        <select id="cparam-f28"
          className={selectClass}
          value={s.tensao_alimentacao}
          onChange={(e) => onPatch({ tensao_alimentacao: Number(e.target.value) })}
        >
          {renderCargaSelectOptions(tensaoOptions)}
        </select>
      </div>
      <div className={colMd3}>
        <label className="form-label" htmlFor="cparam-f29">Tipo de corrente</label>
        <select id="cparam-f29"
          className={selectClass}
          value={s.tipo_corrente}
          onChange={(e) => onPatch({ tipo_corrente: e.target.value as 'CA' | 'CC' })}
        >
          {renderCargaSelectOptions(tipoCorrenteOptions)}
        </select>
      </div>
      <div className={colMd3}>
        <label className="form-label" htmlFor="cparam-f30">Corrente consumida (mA)</label>
        <input id="cparam-f30"
          type="text"
          className={controlClass}
          value={s.corrente_consumida_ma}
          onChange={(e) => onPatch({ corrente_consumida_ma: e.target.value })}
        />
      </div>
      <div className={colMd3}>
        <label className="form-label" htmlFor="cparam-f31">Quantidade de fios</label>
        <input id="cparam-f31"
          type="number"
          min={0}
          className={controlClass}
          value={s.quantidade_fios}
          onChange={(e) =>
            onPatch({ quantidade_fios: e.target.value === '' ? '' : Number(e.target.value) })
          }
        />
      </div>
      {sensorChecks.map((k) => (
        <div key={k} className="col-md-3">
          <div className="form-check mt-2">
            <input
              id={k}
              type="checkbox"
              className="form-check-input"
              checked={s[k]}
              onChange={(e) => onPatch({ [k]: e.target.checked })}
            />
            <label className="form-check-label" htmlFor={k}>
              {ROTULO_SENSOR_CHECK[k]}
            </label>
          </div>
        </div>
      ))}
    </>
  )
}

type TransdutorParametrosProps = Readonly<{
  t: Transdutor
  classes: ClassesCarga
  header: ReactNode
  onPatch: (patch: Partial<Transdutor>) => void
}>

function TransdutorParametros({ t, classes, header, onPatch }: TransdutorParametrosProps) {
  const { colMd, controlClass, selectClass } = classes
  return (
    <>
      {header}
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f32">Tipo</label>
        <select id="cparam-f32"
          className={selectClass}
          value={t.tipo_transdutor}
          onChange={(e) => onPatch({ tipo_transdutor: e.target.value })}
        >
          {renderCargaSelectOptions(tipoTransdutorOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f33">Sinal analógico</label>
        <select id="cparam-f33"
          className={selectClass}
          value={t.tipo_sinal_analogico}
          onChange={(e) => onPatch({ tipo_sinal_analogico: e.target.value })}
        >
          <option value="">Selecione</option>
          {renderCargaSelectOptions(tipoSinalAnalogicoOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f34">Faixa de medição</label>
        <input id="cparam-f34"
          type="text"
          className={controlClass}
          value={t.faixa_medicao}
          onChange={(e) => onPatch({ faixa_medicao: e.target.value })}
        />
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f35">Tensão de alimentação</label>
        <select id="cparam-f35"
          className={selectClass}
          value={t.tensao_alimentacao}
          onChange={(e) => onPatch({ tensao_alimentacao: Number(e.target.value) })}
        >
          {renderCargaSelectOptions(tensaoOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f36">Tipo de corrente</label>
        <select id="cparam-f36"
          className={selectClass}
          value={t.tipo_corrente}
          onChange={(e) => onPatch({ tipo_corrente: e.target.value as 'CA' | 'CC' })}
        >
          {renderCargaSelectOptions(tipoCorrenteOptions)}
        </select>
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f37">Corrente consumida (mA)</label>
        <input id="cparam-f37"
          type="text"
          className={controlClass}
          value={t.corrente_consumida_ma}
          onChange={(e) => onPatch({ corrente_consumida_ma: e.target.value })}
        />
      </div>
      <div className={colMd}>
        <label className="form-label" htmlFor="cparam-f38">Quantidade de fios</label>
        <input id="cparam-f38"
          type="number"
          min={0}
          className={controlClass}
          value={t.quantidade_fios}
          onChange={(e) =>
            onPatch({ quantidade_fios: e.target.value === '' ? '' : Number(e.target.value) })
          }
        />
      </div>
    </>
  )
}

export type CargaParametrosPorTipoProps = Readonly<{
  formData: CargaFormData
  classes: ClassesCarga
  hideOptionalFields: boolean
  renderSectionHeader: (title: string) => ReactNode
  patchMotor: (patch: Partial<Motor>) => void
  patchValvula: (patch: Partial<Valvula>) => void
  patchResistencia: (patch: Partial<Resistencia>) => void
  patchSensor: (patch: Partial<Sensor>) => void
  patchTransdutor: (patch: Partial<Transdutor>) => void
}>

export function CargaParametrosPorTipo({
  formData,
  classes,
  hideOptionalFields,
  renderSectionHeader,
  patchMotor,
  patchValvula,
  patchResistencia,
  patchSensor,
  patchTransdutor,
}: CargaParametrosPorTipoProps) {
  const { tipo } = formData

  if (tipo === 'MOTOR' && formData.motor) {
    return (
      <MotorParametros
        m={formData.motor}
        classes={classes}
        header={renderSectionHeader('Motor')}
        onPatch={patchMotor}
      />
    )
  }
  if (tipo === 'VALVULA' && formData.valvula) {
    return (
      <ValvulaParametros
        v={formData.valvula}
        classes={classes}
        header={renderSectionHeader('Válvula')}
        onPatch={patchValvula}
      />
    )
  }
  if (tipo === 'RESISTENCIA' && formData.resistencia) {
    return (
      <ResistenciaParametros
        r={formData.resistencia}
        classes={classes}
        header={renderSectionHeader('Resistência')}
        onPatch={patchResistencia}
      />
    )
  }
  if (tipo === 'SENSOR' && formData.sensor) {
    return (
      <SensorParametros
        s={formData.sensor}
        classes={classes}
        header={renderSectionHeader('Sensor')}
        onPatch={patchSensor}
      />
    )
  }
  if (tipo === 'TRANSDUTOR' && formData.transdutor) {
    return (
      <TransdutorParametros
        t={formData.transdutor}
        classes={classes}
        header={renderSectionHeader('Transdutor')}
        onPatch={patchTransdutor}
      />
    )
  }
  if (tipo === 'TRANSMISSOR' || tipo === 'OUTRO') {
    return (
      <div className="col-12">
        {classes.isPanel ? null : <hr />}
        <p className="text-muted small mb-0">
          Não há parâmetros específicos adicionais para este tipo no sistema.
          {hideOptionalFields ? null : ' Use observações para detalhar a carga.'}
        </p>
      </div>
    )
  }
  return null
}
