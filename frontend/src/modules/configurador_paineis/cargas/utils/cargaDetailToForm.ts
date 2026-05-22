import type { CargaDetail, CargaFormData } from '../types/carga'
import { emptyNestedForTipo } from './cargaFormDefaults'
import {
  mapMotorDetail,
  mapResistenciaDetail,
  mapSensorDetail,
  mapTransdutorDetail,
  mapValvulaDetail,
  num,
  str,
} from './cargaDetailMappers'

/** Normaliza resposta GET em estado do formulário. */
export function cargaDetailToForm(d: CargaDetail): CargaFormData {
  const nested = emptyNestedForTipo(d.tipo)

  const motor = mapMotorDetail(d)
  if (motor) nested.motor = motor

  const valvula = mapValvulaDetail(d)
  if (valvula) nested.valvula = valvula

  const resistencia = mapResistenciaDetail(d)
  if (resistencia) nested.resistencia = resistencia

  const sensor = mapSensorDetail(d)
  if (sensor) nested.sensor = sensor

  const transdutor = mapTransdutorDetail(d)
  if (transdutor) nested.transdutor = transdutor

  return {
    projeto: d.projeto,
    tag: str(d.tag),
    descricao: str(d.descricao),
    tipo: d.tipo,
    quantidade: num(d.quantidade, 1),
    local_instalacao: str(d.local_instalacao),
    observacoes: str(d.observacoes),
    exige_comando: Boolean(d.exige_comando),
    quantidade_entradas_digitais: num(d.quantidade_entradas_digitais, 0),
    quantidade_entradas_analogicas: num(d.quantidade_entradas_analogicas, 0),
    quantidade_saidas_digitais: num(d.quantidade_saidas_digitais, 0),
    quantidade_saidas_analogicas: num(d.quantidade_saidas_analogicas, 0),
    quantidade_entradas_rapidas: num(d.quantidade_entradas_rapidas, 0),
    ativo: d.ativo !== false,
    ...nested,
  }
}
