import { tipoConexaoCargaPainelOptions } from '../constants/cargaChoiceOptions'
import type { CargaDetail } from '../types/carga'

function labelTipoConexaoPainel(codigo: string | undefined): string {
  if (!codigo) return '—'
  const opt = tipoConexaoCargaPainelOptions.find((o) => o.value === codigo)
  return opt?.label ?? codigo
}

function bool(v: boolean | undefined): string {
  return v ? 'Sim' : 'Não'
}

function formatDecimal(v: string | number | undefined | null, digits: number): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toFixed(digits)
}

function tipoCorrenteLabel(v: string | undefined): string {
  if (v === 'CA') return 'Corrente alternada (CA)'
  if (v === 'CC') return 'Corrente contínua (CC)'
  return v || '—'
}

export function CargaDetailMotorSection({ motor }: { motor: NonNullable<CargaDetail['motor']> }) {
  return (
    <>
      <div className="col-12 mt-3">
        <h2 className="h5">Motor</h2>
      </div>
      <div className="col-md-4">
        <strong>Potência / corrente</strong>
        <div>
          {motor.potencia_corrente_valor} {motor.potencia_corrente_unidade}
        </div>
      </div>
      <div className="col-md-4">
        <strong>Potência kW (calc.)</strong>
        <div>
          {motor.potencia_kw_calculada == null
            ? '—'
            : `${formatDecimal(motor.potencia_kw_calculada, 3)} kW`}
        </div>
      </div>
      <div className="col-md-4">
        <strong>Corrente A (calc.)</strong>
        <div>
          {motor.corrente_calculada_a == null
            ? '—'
            : `${formatDecimal(motor.corrente_calculada_a, 2)} A`}
        </div>
      </div>
      <div className="col-md-3">
        <strong>Rendimento %</strong>
        <div>{motor.rendimento_percentual ?? '—'}</div>
      </div>
      <div className="col-md-3">
        <strong>Fator de potência</strong>
        <div>{motor.fator_potencia ?? '—'}</div>
      </div>
      <div className="col-md-3">
        <strong>Partida</strong>
        <div>{motor.tipo_partida}</div>
      </div>
      <div className="col-md-3">
        <strong>Proteção</strong>
        <div>{motor.tipo_protecao}</div>
      </div>
      <div className="col-md-4">
        <strong>Número de fases</strong>
        <div>{motor.numero_fases ?? '—'}</div>
      </div>
      <div className="col-md-4">
        <strong>Tensão do motor</strong>
        <div>{motor.tensao_motor ?? '—'}</div>
      </div>
      <div className="col-md-2">
        <strong>Reversível</strong>
        <div>{bool(motor.reversivel)}</div>
      </div>
      <div className="col-md-2">
        <strong>Motor tem freio?</strong>
        <div>{bool(motor.freio_motor)}</div>
      </div>
    </>
  )
}

export function CargaDetailValvulaSection({
  valvula,
}: {
  valvula: NonNullable<CargaDetail['valvula']>
}) {
  const mostraRele =
    (valvula.tipo_acionamento === 'RELE_INTERFACE' ||
      valvula.tipo_acionamento === 'RELE_ACOPLADOR') &&
    valvula.tipo_rele_interface

  return (
    <>
      <div className="col-12 mt-3">
        <h2 className="h5">Válvula</h2>
      </div>
      <div className="col-md-4">
        <strong>Tipo</strong>
        <div>{valvula.tipo_valvula}</div>
      </div>
      <div className="col-md-4">
        <strong>Acionamento</strong>
        <div>{valvula.tipo_acionamento ?? '—'}</div>
      </div>
      {mostraRele ? (
        <div className="col-md-4">
          <strong>Relé de interface</strong>
          <div>{valvula.tipo_rele_interface}</div>
        </div>
      ) : null}
      <div className="col-md-2">
        <strong>Feedback</strong>
        <div>{bool(valvula.possui_feedback)}</div>
      </div>
    </>
  )
}

export function CargaDetailResistenciaSection({
  resistencia,
}: {
  resistencia: NonNullable<CargaDetail['resistencia']>
}) {
  return (
    <>
      <div className="col-12 mt-3">
        <h2 className="h5">Resistência</h2>
      </div>
      <div className="col-md-4">
        <strong>Número de fases</strong>
        <div>{resistencia.numero_fases ?? '—'}</div>
      </div>
      <div className="col-md-4">
        <strong>Tensão</strong>
        <div>{resistencia.tensao_resistencia ?? '—'}</div>
      </div>
      <div className="col-md-4">
        <strong>Conexão ao painel</strong>
        <div>{labelTipoConexaoPainel(resistencia.tipo_conexao_painel)}</div>
      </div>
      <div className="col-md-4">
        <strong>Potência (kW)</strong>
        <div>
          {resistencia.potencia_kw == null
            ? '—'
            : `${formatDecimal(resistencia.potencia_kw, 2)} kW`}
        </div>
      </div>
      <div className="col-md-4">
        <strong>Proteção</strong>
        <div>{resistencia.tipo_protecao ?? '—'}</div>
      </div>
      <div className="col-md-4">
        <strong>Acionamento</strong>
        <div>{resistencia.tipo_acionamento ?? '—'}</div>
      </div>
    </>
  )
}

export function CargaDetailSensorSection({
  sensor,
}: {
  sensor: NonNullable<CargaDetail['sensor']>
}) {
  return (
    <>
      <div className="col-12 mt-3">
        <h2 className="h5">Sensor</h2>
      </div>
      <div className="col-md-3">
        <strong>Tipo sensor</strong>
        <div>{sensor.tipo_sensor}</div>
      </div>
      <div className="col-md-3">
        <strong>Sinal</strong>
        <div>{sensor.tipo_sinal}</div>
      </div>
      <div className="col-md-3">
        <strong>Analógico</strong>
        <div>{sensor.tipo_sinal_analogico ?? '—'}</div>
      </div>
      <div className="col-md-3">
        <strong>Tensão</strong>
        <div>{sensor.tensao_alimentacao ?? '—'}</div>
      </div>
      <div className="col-md-3">
        <strong>Corrente</strong>
        <div>{tipoCorrenteLabel(sensor.tipo_corrente)}</div>
      </div>
      <div className="col-md-3">
        <strong>Consumo (mA)</strong>
        <div>
          {sensor.corrente_consumida_ma == null
            ? '—'
            : `${formatDecimal(sensor.corrente_consumida_ma, 2)} mA`}
        </div>
      </div>
      <div className="col-md-3">
        <strong>Fios</strong>
        <div>{sensor.quantidade_fios ?? '—'}</div>
      </div>
      <div className="col-md-2">
        <strong>PNP/NPN</strong>
        <div>
          {sensor.pnp ? 'PNP ' : ''}
          {sensor.npn ? 'NPN' : ''}
          {!sensor.pnp && !sensor.npn ? '—' : ''}
        </div>
      </div>
      <div className="col-md-3">
        <strong>NA / NF</strong>
        <div>
          {bool(sensor.normalmente_aberto)} / {bool(sensor.normalmente_fechado)}
        </div>
      </div>
    </>
  )
}

export function CargaDetailTransdutorSection({
  transdutor,
}: {
  transdutor: NonNullable<CargaDetail['transdutor']>
}) {
  return (
    <>
      <div className="col-12 mt-3">
        <h2 className="h5">Transdutor</h2>
      </div>
      <div className="col-md-3">
        <strong>Tipo</strong>
        <div>{transdutor.tipo_transdutor}</div>
      </div>
      <div className="col-md-3">
        <strong>Sinal</strong>
        <div>{transdutor.tipo_sinal_analogico ?? '—'}</div>
      </div>
      <div className="col-md-3">
        <strong>Faixa</strong>
        <div>{transdutor.faixa_medicao || '—'}</div>
      </div>
      <div className="col-md-3">
        <strong>Tensão</strong>
        <div>{transdutor.tensao_alimentacao ?? '—'}</div>
      </div>
      <div className="col-md-3">
        <strong>Corrente</strong>
        <div>{tipoCorrenteLabel(transdutor.tipo_corrente)}</div>
      </div>
      <div className="col-md-3">
        <strong>Consumo (mA)</strong>
        <div>
          {transdutor.corrente_consumida_ma == null
            ? '—'
            : `${formatDecimal(transdutor.corrente_consumida_ma, 2)} mA`}
        </div>
      </div>
      <div className="col-md-3">
        <strong>Fios</strong>
        <div>{transdutor.quantidade_fios ?? '—'}</div>
      </div>
    </>
  )
}

export function CargaDetailTipoEspecifico({ c }: { c: CargaDetail }) {
  if (c.tipo === 'MOTOR' && c.motor) {
    return <CargaDetailMotorSection motor={c.motor} />
  }
  if (c.tipo === 'VALVULA' && c.valvula) {
    return <CargaDetailValvulaSection valvula={c.valvula} />
  }
  if (c.tipo === 'RESISTENCIA' && c.resistencia) {
    return <CargaDetailResistenciaSection resistencia={c.resistencia} />
  }
  if (c.tipo === 'SENSOR' && c.sensor) {
    return <CargaDetailSensorSection sensor={c.sensor} />
  }
  if (c.tipo === 'TRANSDUTOR' && c.transdutor) {
    return <CargaDetailTransdutorSection transdutor={c.transdutor} />
  }
  return null
}
