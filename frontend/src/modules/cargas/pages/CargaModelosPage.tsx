import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import {
  tipoConexaoCargaPainelOptions,
  tipoPartidaMotorOptions,
  tipoProtecaoMotorOptions,
  tipoSensorOptions,
  tipoSinalAnalogicoOptions,
  tipoSinalOptions,
  tipoTransdutorOptions,
  tipoValvulaOptions,
  unidadePotenciaCorrenteOptions,
} from '../constants/cargaChoiceOptions'
import { renderCargaSelectOptions } from '../components/renderCargaSelectOptions'
import {
  atualizarModeloCarga,
  criarModeloCarga,
  deletarModeloCarga,
  listarModelosCarga,
} from '../services/cargaService'
import type { CargaFormData, CargaModelo, TipoCarga } from '../types/carga'
import {
  applyTipoChange,
  cargaFormInitial,
  tipoCargaOptions,
} from '../utils/cargaFormDefaults'
import { criarPayloadModeloCarga } from '../utils/cargaModelos'

function modeloToFormData(modelo: CargaModelo): CargaFormData {
  const base = applyTipoChange(cargaFormInitial(''), modelo.tipo)
  const payload = modelo.payload as Record<string, unknown>
  if (typeof payload.quantidade === 'number') {
    base.quantidade = payload.quantidade
  }
  if (payload.motor && base.motor) base.motor = payload.motor as typeof base.motor
  if (payload.valvula && base.valvula) base.valvula = payload.valvula as typeof base.valvula
  if (payload.resistencia && base.resistencia) {
    base.resistencia = payload.resistencia as typeof base.resistencia
  }
  if (payload.sensor && base.sensor) base.sensor = payload.sensor as typeof base.sensor
  if (payload.transdutor && base.transdutor) {
    base.transdutor = payload.transdutor as typeof base.transdutor
  }
  return base
}

export default function CargaModelosPage() {
  const { showToast } = useToast()
  const [nome, setNome] = useState('')
  const [base, setBase] = useState<CargaFormData>(() => cargaFormInitial(''))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: modelos = [], isPending, refetch } = useQuery({
    queryKey: ['cargas', 'modelos'],
    queryFn: () => listarModelosCarga(),
  })

  const patchMotor = useCallback((patch: Partial<NonNullable<CargaFormData['motor']>>) => {
    setBase((prev) => (prev.motor ? { ...prev, motor: { ...prev.motor, ...patch } } : prev))
  }, [])
  const patchValvula = useCallback(
    (patch: Partial<NonNullable<CargaFormData['valvula']>>) => {
      setBase((prev) =>
        prev.valvula ? { ...prev, valvula: { ...prev.valvula, ...patch } } : prev
      )
    },
    []
  )
  const patchResistencia = useCallback(
    (patch: Partial<NonNullable<CargaFormData['resistencia']>>) => {
      setBase((prev) =>
        prev.resistencia
          ? { ...prev, resistencia: { ...prev.resistencia, ...patch } }
          : prev
      )
    },
    []
  )
  const patchSensor = useCallback((patch: Partial<NonNullable<CargaFormData['sensor']>>) => {
    setBase((prev) => (prev.sensor ? { ...prev, sensor: { ...prev.sensor, ...patch } } : prev))
  }, [])
  const patchTransdutor = useCallback(
    (patch: Partial<NonNullable<CargaFormData['transdutor']>>) => {
      setBase((prev) =>
        prev.transdutor
          ? { ...prev, transdutor: { ...prev.transdutor, ...patch } }
          : prev
      )
    },
    []
  )

  function resetForm() {
    setNome('')
    setBase(cargaFormInitial(''))
    setEditingId(null)
  }

  async function handleSalvarModelo() {
    if (!nome.trim()) {
      showToast({ variant: 'warning', message: 'Informe o nome do modelo.' })
      return
    }
    try {
      setSaving(true)
      const body = {
        nome: nome.trim(),
        tipo: base.tipo,
        payload: criarPayloadModeloCarga(base),
      }
      if (editingId) {
        await atualizarModeloCarga(editingId, body)
        showToast({ variant: 'success', message: 'Modelo de carga atualizado com sucesso.' })
      } else {
        await criarModeloCarga(body)
        showToast({ variant: 'success', message: 'Modelo de carga criado com sucesso.' })
      }
      resetForm()
      await refetch()
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: editingId ? 'Falha ao atualizar modelo' : 'Falha ao criar modelo',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar o modelo.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluirModelo(modelo: CargaModelo) {
    try {
      await deletarModeloCarga(modelo.id)
      if (editingId === modelo.id) {
        resetForm()
      }
      showToast({ variant: 'success', message: 'Modelo de carga excluído com sucesso.' })
      await refetch()
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Falha ao excluir modelo',
        message: extrairMensagemErroApi(err) || 'Não foi possível excluir o modelo.',
      })
    }
  }

  function handleEditarModelo(modelo: CargaModelo) {
    setEditingId(modelo.id)
    setNome(modelo.nome)
    setBase(modeloToFormData(modelo))
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-start mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1">Modelos de carga</h1>
          <p className="text-muted mb-0">
            Cadastre templates reutilizáveis para acelerar o preenchimento de novas
            cargas.
          </p>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h5 mb-3">{editingId ? 'Editar modelo' : 'Novo modelo'}</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Nome do modelo</label>
              <input
                type="text"
                className="form-control"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex.: Motor trifásico 1CV"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={base.tipo}
                onChange={(event) =>
                  setBase((prev) => applyTipoChange(prev, event.target.value as TipoCarga))
                }
              >
                {tipoCargaOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Quantidade padrão</label>
              <input
                type="number"
                min={1}
                className="form-control"
                value={base.quantidade}
                onChange={(event) =>
                  setBase((prev) => ({
                    ...prev,
                    quantidade: Math.max(1, Number(event.target.value) || 1),
                  }))
                }
              />
            </div>
            {base.tipo === 'MOTOR' && base.motor && (
              <>
                <div className="col-12">
                  <h3 className="h6 mt-2">Parâmetros do motor</h3>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Potência / corrente (valor)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.motor.potencia_corrente_valor}
                    onChange={(event) =>
                      patchMotor({ potencia_corrente_valor: event.target.value })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Unidade</label>
                  <select
                    className="form-select"
                    value={base.motor.potencia_corrente_unidade}
                    onChange={(event) =>
                      patchMotor({
                        potencia_corrente_unidade: event.target.value as 'CV' | 'KW' | 'A',
                      })
                    }
                  >
                    {renderCargaSelectOptions(unidadePotenciaCorrenteOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Rendimento (%)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.motor.rendimento_percentual}
                    onChange={(event) =>
                      patchMotor({ rendimento_percentual: event.target.value })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Fator de potência</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.motor.fator_potencia}
                    onChange={(event) => patchMotor({ fator_potencia: event.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo de partida</label>
                  <select
                    className="form-select"
                    value={base.motor.tipo_partida}
                    onChange={(event) => patchMotor({ tipo_partida: event.target.value })}
                  >
                    {renderCargaSelectOptions(tipoPartidaMotorOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo de proteção</label>
                  <select
                    className="form-select"
                    value={base.motor.tipo_protecao}
                    onChange={(event) => patchMotor({ tipo_protecao: event.target.value })}
                  >
                    {renderCargaSelectOptions(tipoProtecaoMotorOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Conexão ao painel</label>
                  <select
                    className="form-select"
                    value={base.motor.tipo_conexao_painel}
                    onChange={(event) =>
                      patchMotor({ tipo_conexao_painel: event.target.value })
                    }
                  >
                    {renderCargaSelectOptions(tipoConexaoCargaPainelOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tempo de partida (s)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.motor.tempo_partida_s}
                    onChange={(event) => patchMotor({ tempo_partida_s: event.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="col-md-2">
                  <div className="form-check mt-4">
                    <input
                      id="modelo_motor_reversivel"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.motor.reversivel}
                      onChange={(event) => patchMotor({ reversivel: event.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="modelo_motor_reversivel">
                      Reversível
                    </label>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="form-check mt-4">
                    <input
                      id="modelo_motor_freio"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.motor.freio_motor}
                      onChange={(event) => patchMotor({ freio_motor: event.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="modelo_motor_freio">
                      Com freio
                    </label>
                  </div>
                </div>
              </>
            )}

            {base.tipo === 'VALVULA' && base.valvula && (
              <>
                <div className="col-12">
                  <h3 className="h6 mt-2">Parâmetros da válvula</h3>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo de válvula</label>
                  <select
                    className="form-select"
                    value={base.valvula.tipo_valvula}
                    onChange={(event) => patchValvula({ tipo_valvula: event.target.value })}
                  >
                    {renderCargaSelectOptions(tipoValvulaOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Qtd. vias</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.valvula.quantidade_vias}
                    onChange={(event) =>
                      patchValvula({ quantidade_vias: event.target.value })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Qtd. posições</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.valvula.quantidade_posicoes}
                    onChange={(event) =>
                      patchValvula({ quantidade_posicoes: event.target.value })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <div className="form-check mt-2">
                    <input
                      id="modelo_valvula_retorno_mola"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.valvula.retorno_mola}
                      onChange={(event) =>
                        patchValvula({ retorno_mola: event.target.checked })
                      }
                    />
                    <label
                      className="form-check-label"
                      htmlFor="modelo_valvula_retorno_mola"
                    >
                      Retorno por mola
                    </label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-check mt-2">
                    <input
                      id="modelo_valvula_feedback"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.valvula.possui_feedback}
                      onChange={(event) =>
                        patchValvula({ possui_feedback: event.target.checked })
                      }
                    />
                    <label className="form-check-label" htmlFor="modelo_valvula_feedback">
                      Possui feedback
                    </label>
                  </div>
                </div>
              </>
            )}

            {base.tipo === 'RESISTENCIA' && base.resistencia && (
              <>
                <div className="col-12">
                  <h3 className="h6 mt-2">Parâmetros da resistência</h3>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Quantidade de etapas</label>
                  <input
                    type="number"
                    min={1}
                    className="form-control"
                    value={base.resistencia.quantidade_etapas}
                    onChange={(event) =>
                      patchResistencia({
                        quantidade_etapas: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <div className="form-check mt-4">
                    <input
                      id="modelo_resistencia_etapas"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.resistencia.controle_em_etapas}
                      onChange={(event) =>
                        patchResistencia({ controle_em_etapas: event.target.checked })
                      }
                    />
                    <label className="form-check-label" htmlFor="modelo_resistencia_etapas">
                      Controle em etapas
                    </label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-check mt-4">
                    <input
                      id="modelo_resistencia_pid"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.resistencia.controle_pid}
                      onChange={(event) =>
                        patchResistencia({ controle_pid: event.target.checked })
                      }
                    />
                    <label className="form-check-label" htmlFor="modelo_resistencia_pid">
                      Controle PID
                    </label>
                  </div>
                </div>
              </>
            )}

            {base.tipo === 'SENSOR' && base.sensor && (
              <>
                <div className="col-12">
                  <h3 className="h6 mt-2">Parâmetros do sensor</h3>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo de sensor</label>
                  <select
                    className="form-select"
                    value={base.sensor.tipo_sensor}
                    onChange={(event) => patchSensor({ tipo_sensor: event.target.value })}
                  >
                    {renderCargaSelectOptions(tipoSensorOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo de sinal</label>
                  <select
                    className="form-select"
                    value={base.sensor.tipo_sinal}
                    onChange={(event) => patchSensor({ tipo_sinal: event.target.value })}
                  >
                    {renderCargaSelectOptions(tipoSinalOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Sinal analógico</label>
                  <select
                    className="form-select"
                    value={base.sensor.tipo_sinal_analogico}
                    onChange={(event) =>
                      patchSensor({ tipo_sinal_analogico: event.target.value })
                    }
                    disabled={base.sensor.tipo_sinal !== 'ANALOGICO'}
                  >
                    <option value="">Selecione</option>
                    {renderCargaSelectOptions(tipoSinalAnalogicoOptions)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Faixa / range</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.sensor.range_medicao}
                    onChange={(event) => patchSensor({ range_medicao: event.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <div className="form-check mt-2">
                    <input
                      id="modelo_sensor_pnp"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.sensor.pnp}
                      onChange={(event) => patchSensor({ pnp: event.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="modelo_sensor_pnp">
                      PNP
                    </label>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-check mt-2">
                    <input
                      id="modelo_sensor_npn"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.sensor.npn}
                      onChange={(event) => patchSensor({ npn: event.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="modelo_sensor_npn">
                      NPN
                    </label>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-check mt-2">
                    <input
                      id="modelo_sensor_na"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.sensor.normalmente_aberto}
                      onChange={(event) =>
                        patchSensor({ normalmente_aberto: event.target.checked })
                      }
                    />
                    <label className="form-check-label" htmlFor="modelo_sensor_na">
                      Normalmente aberto
                    </label>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-check mt-2">
                    <input
                      id="modelo_sensor_nf"
                      type="checkbox"
                      className="form-check-input"
                      checked={base.sensor.normalmente_fechado}
                      onChange={(event) =>
                        patchSensor({ normalmente_fechado: event.target.checked })
                      }
                    />
                    <label className="form-check-label" htmlFor="modelo_sensor_nf">
                      Normalmente fechado
                    </label>
                  </div>
                </div>
              </>
            )}

            {base.tipo === 'TRANSDUTOR' && base.transdutor && (
              <>
                <div className="col-12">
                  <h3 className="h6 mt-2">Parâmetros do transdutor</h3>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={base.transdutor.tipo_transdutor}
                    onChange={(event) =>
                      patchTransdutor({ tipo_transdutor: event.target.value })
                    }
                  >
                    {renderCargaSelectOptions(tipoTransdutorOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Sinal analógico</label>
                  <select
                    className="form-select"
                    value={base.transdutor.tipo_sinal_analogico}
                    onChange={(event) =>
                      patchTransdutor({ tipo_sinal_analogico: event.target.value })
                    }
                  >
                    <option value="">Selecione</option>
                    {renderCargaSelectOptions(tipoSinalAnalogicoOptions)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Faixa de medição</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.transdutor.faixa_medicao}
                    onChange={(event) =>
                      patchTransdutor({ faixa_medicao: event.target.value })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Precisão</label>
                  <input
                    type="text"
                    className="form-control"
                    value={base.transdutor.precisao}
                    onChange={(event) => patchTransdutor({ precisao: event.target.value })}
                  />
                </div>
              </>
            )}

            <div className="col-12">
              <div className="form-text">
                O modelo guarda apenas tipo, quantidade e parâmetros técnicos específicos.
                Campos de projeto (tag, local, observações, requisitos e ocupação de I/O)
                ficam fora do template.
              </div>
            </div>
            <div className="col-12 d-flex justify-content-end">
              {editingId ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary me-2"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancelar edição
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSalvarModelo()}
                disabled={saving}
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar modelo'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Modelos cadastrados</h2>
          {isPending && <p className="text-muted mb-0">Carregando modelos...</p>}
          {!isPending && modelos.length === 0 && (
            <p className="text-muted mb-0">Nenhum modelo cadastrado até o momento.</p>
          )}
          {!isPending && modelos.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Ativo</th>
                    <th className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {modelos.map((modelo) => (
                    <tr key={modelo.id}>
                      <td>{modelo.nome}</td>
                      <td>{modelo.tipo}</td>
                      <td>{modelo.ativo ? 'Sim' : 'Não'}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => handleEditarModelo(modelo)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => void handleExcluirModelo(modelo)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
