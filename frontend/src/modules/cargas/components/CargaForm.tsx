import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Projeto } from '@/modules/projetos/types/projeto'
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
import { applyTipoChange, tipoCargaOptions } from '../utils/cargaFormDefaults'
import type { CargaFormData, TipoCarga } from '../types/carga'
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
}

export default function CargaForm({
  projetos,
  onSubmit,
  onChange,
  loading = false,
  initialData,
  suggestedTag,
  lockProjeto = false,
}: CargaFormProps) {
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

  useEffect(() => {
    if (!formData.projeto) return
    const p = projetos.find((x) => x.id === formData.projeto)
    if (p && !p.possui_plc) {
      setFormData((prev) => ({
        ...prev,
        ocupa_entrada_digital: false,
        ocupa_entrada_analogica: false,
        ocupa_saida_digital: false,
        ocupa_saida_analogica: false,
      }))
    }
  }, [formData.projeto, projetos])

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

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      await onSubmit(formData)
    },
    [formData, onSubmit]
  )

  const m = formData.motor
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

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div className="row g-3">
        <div className="col-12">
          <h2 className="h5">Projeto e identificação</h2>
        </div>

        <div className="col-md-6">
          <label className="form-label">Projeto</label>
          <select
            name="projeto"
            className="form-select"
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

        <div className="col-md-3">
          <label className="form-label">Tipo de carga</label>
          <select
            name="tipo"
            className="form-select"
            value={formData.tipo}
            onChange={handleBaseChange}
          >
            {renderCargaSelectOptions(tipoCargaOptions)}
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">Quantidade</label>
          <input
            type="number"
            name="quantidade"
            className="form-control"
            min={1}
            value={formData.quantidade}
            onChange={handleBaseChange}
            required
          />
        </div>

        <div className="col-md-4">
          <label className="form-label">Tag</label>
          <input
            type="text"
            name="tag"
            className="form-control"
            value={formData.tag}
            onChange={handleBaseChange}
            required
            placeholder="Ex.: M01, YV01"
          />
        </div>

        <div className="col-md-8">
          <label className="form-label">Descrição</label>
          <input
            type="text"
            name="descricao"
            className="form-control"
            value={formData.descricao}
            onChange={handleBaseChange}
            required
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Local de instalação</label>
          <input
            type="text"
            name="local_instalacao"
            className="form-control"
            value={formData.local_instalacao}
            onChange={handleBaseChange}
            placeholder="Opcional"
          />
        </div>

        <div className="col-12">
          <label className="form-label">Observações</label>
          <textarea
            name="observacoes"
            className="form-control"
            rows={2}
            value={formData.observacoes}
            onChange={handleBaseChange}
          />
        </div>

        <div className="col-12">
          <h2 className="h5 mt-2">Requisitos</h2>
        </div>

        {(
          [
            ['exige_comando', 'Exige comando'],
            ['ativo', 'Ativo'],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="col-md-4">
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
            <div className="col-12 mt-2">
              <h3 className="h6 text-muted mb-0">
                Ocupação de I/O (projeto com PLC)
              </h3>
            </div>
            {(
              [
                ['ocupa_entrada_digital', 'Ocupa entrada digital'],
                ['ocupa_entrada_analogica', 'Ocupa entrada analógica'],
                ['ocupa_saida_digital', 'Ocupa saída digital'],
                ['ocupa_saida_analogica', 'Ocupa saída analógica'],
              ] as const
            ).map(([name, label]) => (
              <div key={name} className="col-md-4">
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
          </>
        )}

        {formData.projeto && !mostrarOcupacaoIo && (
          <div className="col-12">
            <p className="small text-muted mb-0">
              Ocupação de entradas e saídas digitais/analógicas só pode ser
              informada quando o projeto possui <strong>PLC</strong> cadastrado.
            </p>
          </div>
        )}

        {formData.tipo === 'MOTOR' && m && (
          <>
            <div className="col-12">
              <hr />
              <h2 className="h5">Motor</h2>
            </div>
            <div className="col-md-4">
              <label className="form-label">Potência / corrente (valor)</label>
              <input
                type="text"
                className="form-control"
                value={m.potencia_corrente_valor}
                onChange={(e) =>
                  patchMotor({ potencia_corrente_valor: e.target.value })
                }
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Unidade</label>
              <select
                className="form-select"
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
                <div className="col-md-4">
                  <label className="form-label">Rendimento (%)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={m.rendimento_percentual}
                    onChange={(e) =>
                      patchMotor({ rendimento_percentual: e.target.value })
                    }
                  />
                  <div className="form-text">
                    Usado no cálculo de corrente quando a unidade é CV ou kW.
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Fator de potência</label>
                  <input
                    type="text"
                    className="form-control"
                    value={m.fator_potencia}
                    onChange={(e) =>
                      patchMotor({ fator_potencia: e.target.value })
                    }
                  />
                </div>
              </>
            )}
            <div className="col-md-4">
              <label className="form-label">Tipo de partida</label>
              <select
                className="form-select"
                value={m.tipo_partida}
                onChange={(e) => patchMotor({ tipo_partida: e.target.value })}
              >
                {renderCargaSelectOptions(tipoPartidaMotorOptions)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tipo de proteção</label>
              <select
                className="form-select"
                value={m.tipo_protecao}
                onChange={(e) => patchMotor({ tipo_protecao: e.target.value })}
              >
                {renderCargaSelectOptions(tipoProtecaoMotorOptions)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Conexão ao painel</label>
              <select
                className="form-select"
                value={m.tipo_conexao_painel}
                onChange={(e) =>
                  patchMotor({ tipo_conexao_painel: e.target.value })
                }
              >
                {renderCargaSelectOptions(tipoConexaoCargaPainelOptions)}
              </select>
            </div>
            {motorMostraTempoPartida && (
              <div className="col-md-4">
                <label className="form-label">Tempo de partida (s)</label>
                <input
                  type="text"
                  className="form-control"
                  value={m.tempo_partida_s}
                  onChange={(e) =>
                    patchMotor({ tempo_partida_s: e.target.value })
                  }
                  placeholder="Opcional"
                />
              </div>
            )}
            <div className="col-md-4">
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
            <div className="col-md-4">
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
            <div className="col-12">
              <hr />
              <h2 className="h5">Válvula</h2>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tipo de válvula</label>
              <select
                className="form-select"
                value={v.tipo_valvula}
                onChange={(e) => patchValvula({ tipo_valvula: e.target.value })}
              >
                {renderCargaSelectOptions(tipoValvulaOptions)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Qtd. vias</label>
              <input
                type="text"
                className="form-control"
                value={v.quantidade_vias}
                onChange={(e) =>
                  patchValvula({ quantidade_vias: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Qtd. posições</label>
              <input
                type="text"
                className="form-control"
                value={v.quantidade_posicoes}
                onChange={(e) =>
                  patchValvula({ quantidade_posicoes: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <div className="form-check mt-2">
                <input
                  id="retorno_mola"
                  type="checkbox"
                  className="form-check-input"
                  checked={v.retorno_mola}
                  onChange={(e) =>
                    patchValvula({ retorno_mola: e.target.checked })
                  }
                />
                <label className="form-check-label" htmlFor="retorno_mola">
                  Retorno por mola
                </label>
              </div>
            </div>
            <div className="col-md-4">
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
            <div className="col-12">
              <hr />
              <h2 className="h5">Resistência</h2>
            </div>
            <div className="col-md-4">
              <label className="form-label">Quantidade de etapas</label>
              <input
                type="number"
                min={1}
                className="form-control"
                value={r.quantidade_etapas}
                onChange={(e) =>
                  patchResistencia({
                    quantidade_etapas: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </div>
            <div className="col-md-4">
              <div className="form-check mt-4">
                <input
                  id="controle_em_etapas"
                  type="checkbox"
                  className="form-check-input"
                  checked={r.controle_em_etapas}
                  onChange={(e) =>
                    patchResistencia({ controle_em_etapas: e.target.checked })
                  }
                />
                <label className="form-check-label" htmlFor="controle_em_etapas">
                  Controle em etapas
                </label>
              </div>
            </div>
            <div className="col-md-4">
              <div className="form-check mt-4">
                <input
                  id="controle_pid"
                  type="checkbox"
                  className="form-check-input"
                  checked={r.controle_pid}
                  onChange={(e) =>
                    patchResistencia({ controle_pid: e.target.checked })
                  }
                />
                <label className="form-check-label" htmlFor="controle_pid">
                  Controle PID
                </label>
              </div>
            </div>
          </>
        )}

        {formData.tipo === 'SENSOR' && s && (
          <>
            <div className="col-12">
              <hr />
              <h2 className="h5">Sensor</h2>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tipo de sensor</label>
              <select
                className="form-select"
                value={s.tipo_sensor}
                onChange={(e) => patchSensor({ tipo_sensor: e.target.value })}
              >
                {renderCargaSelectOptions(tipoSensorOptions)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tipo de sinal</label>
              <select
                className="form-select"
                value={s.tipo_sinal}
                onChange={(e) => patchSensor({ tipo_sinal: e.target.value })}
              >
                {renderCargaSelectOptions(tipoSinalOptions)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Sinal analógico</label>
              <select
                className="form-select"
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
            <div className="col-md-6">
              <label className="form-label">Faixa / range</label>
              <input
                type="text"
                className="form-control"
                value={s.range_medicao}
                onChange={(e) => patchSensor({ range_medicao: e.target.value })}
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
            <div className="col-12">
              <hr />
              <h2 className="h5">Transdutor</h2>
            </div>
            <div className="col-md-4">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={t.tipo_transdutor}
                onChange={(e) =>
                  patchTransdutor({ tipo_transdutor: e.target.value })
                }
              >
                {renderCargaSelectOptions(tipoTransdutorOptions)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Sinal analógico</label>
              <select
                className="form-select"
                value={t.tipo_sinal_analogico}
                onChange={(e) =>
                  patchTransdutor({ tipo_sinal_analogico: e.target.value })
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
                value={t.faixa_medicao}
                onChange={(e) =>
                  patchTransdutor({ faixa_medicao: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Precisão</label>
              <input
                type="text"
                className="form-control"
                value={t.precisao}
                onChange={(e) => patchTransdutor({ precisao: e.target.value })}
              />
            </div>
          </>
        )}

        {(formData.tipo === 'TRANSMISSOR' || formData.tipo === 'OUTRO') && (
          <div className="col-12">
            <hr />
            <p className="text-muted small mb-0">
              Não há parâmetros específicos adicionais para este tipo no sistema.
              Use observações para detalhar a carga.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 d-flex gap-2">
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar carga'}
        </button>
      </div>
    </form>
  )
}
