/**
 * Estimativa de ocupação de IO no formulário (preview antes de salvar).
 * Espelha regras de `sincronizar_quantidades_carga` no backend quando há PLC.
 */

import type { CargaFormData } from '../types/carga'

export type OcupacaoIoCarga = {
  quantidade_entradas_digitais: number
  quantidade_entradas_analogicas: number
  quantidade_saidas_digitais: number
  quantidade_saidas_analogicas: number
  quantidade_entradas_rapidas: number
}

const IO_ZERADO: OcupacaoIoCarga = {
  quantidade_entradas_digitais: 0,
  quantidade_entradas_analogicas: 0,
  quantidade_saidas_digitais: 0,
  quantidade_saidas_analogicas: 0,
  quantidade_entradas_rapidas: 0,
}

export function calcularSaidasDigitaisMotor(
  partida: string,
  reversivel: boolean,
  freioMotor: boolean
): number {
  let saidas = 1

  if (partida === 'ESTRELA_TRIANGULO') {
    saidas = 3
  } else if (
    partida === 'DIRETA' ||
    partida === 'SOFT_STARTER' ||
    partida === 'INVERSOR' ||
    partida === 'SERVO_DRIVE'
  ) {
    saidas = 1
  }

  if (reversivel) saidas += 1
  if (freioMotor) saidas += 1
  return saidas
}

function ioMotor(
  formData: CargaFormData,
  calcularSaidas: typeof calcularSaidasDigitaisMotor
): OcupacaoIoCarga {
  const motor = formData.motor
  if (!motor) return IO_ZERADO

  const partida = motor.tipo_partida
  const partidasComIo = [
    'DIRETA',
    'ESTRELA_TRIANGULO',
    'SOFT_STARTER',
    'INVERSOR',
    'SERVO_DRIVE',
  ]
  if (!partidasComIo.includes(partida)) return IO_ZERADO

  return {
    ...IO_ZERADO,
    quantidade_entradas_digitais: 1,
    quantidade_saidas_digitais: calcularSaidas(
      partida,
      Boolean(motor.reversivel),
      Boolean(motor.freio_motor)
    ),
  }
}

function ioValvula(formData: CargaFormData): OcupacaoIoCarga {
  const valvula = formData.valvula
  if (!valvula) return IO_ZERADO
  return {
    ...IO_ZERADO,
    quantidade_entradas_digitais: valvula.possui_feedback ? 1 : 0,
    quantidade_saidas_digitais: Math.max(1, Number(valvula.quantidade_solenoides) || 1),
  }
}

function ioResistencia(): OcupacaoIoCarga {
  return { ...IO_ZERADO, quantidade_saidas_digitais: 1 }
}

function ioSensor(formData: CargaFormData): OcupacaoIoCarga {
  const sensor = formData.sensor
  if (!sensor) return IO_ZERADO

  const io = { ...IO_ZERADO }
  const sinal = sensor.tipo_sinal
  if (sinal === 'DIGITAL') io.quantidade_entradas_digitais = 1
  if (sinal === 'ANALOGICO') io.quantidade_entradas_analogicas = 1
  if (sinal === 'ANALOGICO_DIGITAL') {
    io.quantidade_entradas_digitais = 1
    io.quantidade_entradas_analogicas = 1
  }
  if (sensor.tipo_sensor === 'ENCODER') io.quantidade_entradas_rapidas = 1
  return io
}

function ioTransdutor(): OcupacaoIoCarga {
  return { ...IO_ZERADO, quantidade_entradas_analogicas: 1 }
}

export function calcularOcupacaoIoCarga(
  formData: CargaFormData,
  calcularSaidas: typeof calcularSaidasDigitaisMotor = calcularSaidasDigitaisMotor
): OcupacaoIoCarga {
  if (!formData.exige_comando) return IO_ZERADO

  switch (formData.tipo) {
    case 'MOTOR':
      return ioMotor(formData, calcularSaidas)
    case 'VALVULA':
      return ioValvula(formData)
    case 'RESISTENCIA':
      return formData.resistencia ? ioResistencia() : IO_ZERADO
    case 'SENSOR':
      return ioSensor(formData)
    case 'TRANSDUTOR':
      return ioTransdutor()
    default:
      return IO_ZERADO
  }
}
