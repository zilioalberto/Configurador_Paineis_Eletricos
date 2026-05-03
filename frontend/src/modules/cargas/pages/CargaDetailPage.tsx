import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { tipoConexaoCargaPainelOptions } from '../constants/cargaChoiceOptions'
import { useCargaDetailQuery } from '../hooks/useCargaDetailQuery'
import { projetoPermiteEdicaoCargas } from '../utils/projetoEdicaoCargas'

function bool(v: boolean | undefined): string {
  return v ? 'Sim' : 'Não'
}

function tipoCorrenteLabel(v: string | undefined): string {
  if (v === 'CA') return 'Corrente alternada (CA)'
  if (v === 'CC') return 'Corrente contínua (CC)'
  return v || '—'
}

function formatDecimal(v: string | number | undefined | null, digits: number): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toFixed(digits)
}

function labelTipoConexaoPainel(codigo: string | undefined): string {
  if (!codigo) return '—'
  const opt = tipoConexaoCargaPainelOptions.find((o) => o.value === codigo)
  return opt?.label ?? codigo
}

type LocationState = { from?: string }

function hrefListaCargasSeguro(state: unknown, projetoId: string | undefined): string {
  const from = (state as LocationState | null)?.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from
  }
  if (projetoId) {
    return `/cargas?projeto=${encodeURIComponent(projetoId)}`
  }
  return '/cargas'
}

export default function CargaDetailPage() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { data: c, isPending, isError, error } = useCargaDetailQuery(id)
  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const projetoDaCarga =
    c != null ? projetos.find((p) => p.id === c.projeto) : undefined
  const canEditCarga = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)
  const podeEditar =
    !loadingProjetos && c != null && projetoPermiteEdicaoCargas(projetoDaCarga)

  const fecharHref = useMemo(
    () => hrefListaCargasSeguro(location.state, c?.projeto),
    [location.state, c?.projeto]
  )

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Detalhes da carga</h1>
          <p className="text-muted mb-0">Leitura dos dados cadastrados.</p>
        </div>
        {id ? (
          <div className="d-flex flex-wrap gap-2">
            <Link to={fecharHref} className="btn btn-outline-secondary">
              Fechar
            </Link>
            {canEditCarga && podeEditar ? (
              <Link to={`/cargas/${id}/editar`} className="btn btn-primary">
                Editar
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="card-body">
          {!id && (
            <div className="alert alert-danger mb-0" role="alert">
              Carga não informada.
            </div>
          )}

          {id && isPending && <p className="mb-0 text-muted">Carregando...</p>}

          {id && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {error instanceof Error
                ? error.message
                : 'Não foi possível carregar a carga.'}
            </div>
          )}

          {id && !isPending && !isError && c && (
            <div className="row g-3">
              <div className="col-12">
                <h2 className="h5">Identificação</h2>
              </div>
              <div className="col-md-4">
                <strong>Projeto</strong>
                <div>
                  {c.projeto_codigo && c.projeto_nome
                    ? `${c.projeto_codigo} — ${c.projeto_nome}`
                    : c.projeto}
                </div>
              </div>
              <div className="col-md-2">
                <strong>Tag</strong>
                <div>{c.tag}</div>
              </div>
              <div className="col-md-4">
                <strong>Descrição</strong>
                <div>{c.descricao}</div>
              </div>
              <div className="col-md-2">
                <strong>Tipo</strong>
                <div>{c.tipo_display ?? c.tipo}</div>
              </div>
              <div className="col-md-2">
                <strong>Quantidade</strong>
                <div>{c.quantidade}</div>
              </div>
              <div className="col-md-4">
                <strong>Local de instalação</strong>
                <div>{c.local_instalacao || '—'}</div>
              </div>
              <div className="col-12">
                <strong>Observações</strong>
                <div className="text-break">{c.observacoes || '—'}</div>
              </div>

              <div className="col-12 mt-2">
                <h2 className="h5">Requisitos / I/O</h2>
              </div>
              <div className="col-md-3">
                <strong>Exige proteção</strong>
                <div>{bool(c.exige_protecao)}</div>
              </div>
              <div className="col-md-3">
                <strong>Exige seccionamento</strong>
                <div>{bool(c.exige_seccionamento)}</div>
              </div>
              <div className="col-md-3">
                <strong>Exige comando</strong>
                <div>{bool(c.exige_comando)}</div>
              </div>
              <div className="col-md-3">
                <strong>Entr. digital</strong>
                <div>{c.quantidade_entradas_digitais ?? 0}</div>
              </div>
              <div className="col-md-3">
                <strong>Entr. analógica</strong>
                <div>{c.quantidade_entradas_analogicas ?? 0}</div>
              </div>
              <div className="col-md-3">
                <strong>Saída digital</strong>
                <div>{c.quantidade_saidas_digitais ?? 0}</div>
              </div>
              <div className="col-md-3">
                <strong>Saída analógica</strong>
                <div>{c.quantidade_saidas_analogicas ?? 0}</div>
              </div>
              <div className="col-md-3">
                <strong>Entr. rápida</strong>
                <div>{c.quantidade_entradas_rapidas ?? 0}</div>
              </div>
              <div className="col-md-3">
                <strong>Ativo</strong>
                <div>{bool(c.ativo)}</div>
              </div>

              {c.tipo === 'MOTOR' && c.motor && (
                <>
                  <div className="col-12 mt-3">
                    <h2 className="h5">Motor</h2>
                  </div>
                  <div className="col-md-4">
                    <strong>Potência / corrente</strong>
                    <div>
                      {c.motor.potencia_corrente_valor}{' '}
                      {c.motor.potencia_corrente_unidade}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <strong>Potência kW (calc.)</strong>
                    <div>
                      {c.motor.potencia_kw_calculada == null
                        ? '—'
                        : `${formatDecimal(c.motor.potencia_kw_calculada, 3)} kW`}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <strong>Corrente A (calc.)</strong>
                    <div>
                      {c.motor.corrente_calculada_a == null
                        ? '—'
                        : `${formatDecimal(c.motor.corrente_calculada_a, 2)} A`}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <strong>Rendimento %</strong>
                    <div>{c.motor.rendimento_percentual ?? '—'}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Fator de potência</strong>
                    <div>{c.motor.fator_potencia ?? '—'}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Partida</strong>
                    <div>{c.motor.tipo_partida}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Proteção</strong>
                    <div>{c.motor.tipo_protecao}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Número de fases</strong>
                    <div>{c.motor.numero_fases ?? '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Tensão do motor</strong>
                    <div>{c.motor.tensao_motor ?? '—'}</div>
                  </div>
                  <div className="col-md-2">
                    <strong>Reversível</strong>
                    <div>{bool(c.motor.reversivel)}</div>
                  </div>
                  <div className="col-md-2">
                    <strong>Motor tem freio?</strong>
                    <div>{bool(c.motor.freio_motor)}</div>
                  </div>
                </>
              )}

              {c.tipo === 'VALVULA' && c.valvula && (
                <>
                  <div className="col-12 mt-3">
                    <h2 className="h5">Válvula</h2>
                  </div>
                  <div className="col-md-4">
                    <strong>Tipo</strong>
                    <div>{c.valvula.tipo_valvula}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Acionamento</strong>
                    <div>{c.valvula.tipo_acionamento ?? '—'}</div>
                  </div>
                  {(c.valvula.tipo_acionamento === 'RELE_INTERFACE' ||
                    c.valvula.tipo_acionamento === 'RELE_ACOPLADOR') &&
                    c.valvula.tipo_rele_interface && (
                      <div className="col-md-4">
                        <strong>Relé de interface</strong>
                        <div>{c.valvula.tipo_rele_interface}</div>
                      </div>
                    )}
                  <div className="col-md-2">
                    <strong>Feedback</strong>
                    <div>{bool(c.valvula.possui_feedback)}</div>
                  </div>
                </>
              )}

              {c.tipo === 'RESISTENCIA' && c.resistencia && (
                <>
                  <div className="col-12 mt-3">
                    <h2 className="h5">Resistência</h2>
                  </div>
                  <div className="col-md-4">
                    <strong>Número de fases</strong>
                    <div>{c.resistencia.numero_fases ?? '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Tensão</strong>
                    <div>{c.resistencia.tensao_resistencia ?? '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Conexão ao painel</strong>
                    <div>
                      {labelTipoConexaoPainel(c.resistencia.tipo_conexao_painel)}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <strong>Potência (kW)</strong>
                    <div>
                      {c.resistencia.potencia_kw == null
                        ? '—'
                        : `${formatDecimal(c.resistencia.potencia_kw, 2)} kW`}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <strong>Proteção</strong>
                    <div>{c.resistencia.tipo_protecao ?? '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Acionamento</strong>
                    <div>{c.resistencia.tipo_acionamento ?? '—'}</div>
                  </div>
                </>
              )}

              {c.tipo === 'SENSOR' && c.sensor && (
                <>
                  <div className="col-12 mt-3">
                    <h2 className="h5">Sensor</h2>
                  </div>
                  <div className="col-md-3">
                    <strong>Tipo sensor</strong>
                    <div>{c.sensor.tipo_sensor}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Sinal</strong>
                    <div>{c.sensor.tipo_sinal}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Analógico</strong>
                    <div>{c.sensor.tipo_sinal_analogico ?? '—'}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Tensão</strong>
                    <div>{c.sensor.tensao_alimentacao ?? '—'}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Corrente</strong>
                    <div>{tipoCorrenteLabel(c.sensor.tipo_corrente)}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Consumo (mA)</strong>
                    <div>
                      {c.sensor.corrente_consumida_ma == null
                        ? '—'
                        : `${formatDecimal(c.sensor.corrente_consumida_ma, 2)} mA`}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <strong>Fios</strong>
                    <div>{c.sensor.quantidade_fios ?? '—'}</div>
                  </div>
                  <div className="col-md-2">
                    <strong>PNP/NPN</strong>
                    <div>
                      {c.sensor.pnp ? 'PNP ' : ''}
                      {c.sensor.npn ? 'NPN' : ''}
                      {!c.sensor.pnp && !c.sensor.npn ? '—' : ''}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <strong>NA / NF</strong>
                    <div>
                      {bool(c.sensor.normalmente_aberto)} /{' '}
                      {bool(c.sensor.normalmente_fechado)}
                    </div>
                  </div>
                </>
              )}

              {c.tipo === 'TRANSDUTOR' && c.transdutor && (
                <>
                  <div className="col-12 mt-3">
                    <h2 className="h5">Transdutor</h2>
                  </div>
                  <div className="col-md-3">
                    <strong>Tipo</strong>
                    <div>{c.transdutor.tipo_transdutor}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Sinal</strong>
                    <div>{c.transdutor.tipo_sinal_analogico ?? '—'}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Faixa</strong>
                    <div>{c.transdutor.faixa_medicao || '—'}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Tensão</strong>
                    <div>{c.transdutor.tensao_alimentacao ?? '—'}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Corrente</strong>
                    <div>{tipoCorrenteLabel(c.transdutor.tipo_corrente)}</div>
                  </div>
                  <div className="col-md-3">
                    <strong>Consumo (mA)</strong>
                    <div>
                      {c.transdutor.corrente_consumida_ma == null
                        ? '—'
                        : `${formatDecimal(c.transdutor.corrente_consumida_ma, 2)} mA`}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <strong>Fios</strong>
                    <div>{c.transdutor.quantidade_fios ?? '—'}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
