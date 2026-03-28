import { Link, useParams } from 'react-router-dom'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { useCargaDetailQuery } from '../hooks/useCargaDetailQuery'
import { projetoPermiteEdicaoCargas } from '../utils/projetoEdicaoCargas'

function bool(v: boolean | undefined): string {
  return v ? 'Sim' : 'Não'
}

export default function CargaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: c, isPending, isError, error } = useCargaDetailQuery(id)
  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const projetoDaCarga =
    c != null ? projetos.find((p) => p.id === c.projeto) : undefined
  const podeEditar =
    !loadingProjetos && c != null && projetoPermiteEdicaoCargas(projetoDaCarga)

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Detalhes da carga</h1>
          <p className="text-muted mb-0">Leitura dos dados cadastrados.</p>
        </div>
        {id && podeEditar && (
          <Link to={`/cargas/${id}/editar`} className="btn btn-primary">
            Editar
          </Link>
        )}
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
                <strong>Exige fonte auxiliar</strong>
                <div>{bool(c.exige_fonte_auxiliar)}</div>
              </div>
              <div className="col-md-3">
                <strong>Entr. digital</strong>
                <div>{bool(c.ocupa_entrada_digital)}</div>
              </div>
              <div className="col-md-3">
                <strong>Entr. analógica</strong>
                <div>{bool(c.ocupa_entrada_analogica)}</div>
              </div>
              <div className="col-md-3">
                <strong>Saída digital</strong>
                <div>{bool(c.ocupa_saida_digital)}</div>
              </div>
              <div className="col-md-3">
                <strong>Saída analógica</strong>
                <div>{bool(c.ocupa_saida_analogica)}</div>
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
                    <div>{c.motor.potencia_kw_calculada ?? '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Corrente A (calc.)</strong>
                    <div>{c.motor.corrente_calculada_a ?? '—'}</div>
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
                    <strong>Conexão ao painel</strong>
                    <div>{c.motor.tipo_conexao_painel}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Tempo partida (s)</strong>
                    <div>{c.motor.tempo_partida_s ?? '—'}</div>
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
                  <div className="col-md-2">
                    <strong>Vias</strong>
                    <div>{c.valvula.quantidade_vias ?? '—'}</div>
                  </div>
                  <div className="col-md-2">
                    <strong>Posições</strong>
                    <div>{c.valvula.quantidade_posicoes ?? '—'}</div>
                  </div>
                  <div className="col-md-2">
                    <strong>Retorno mola</strong>
                    <div>{bool(c.valvula.retorno_mola)}</div>
                  </div>
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
                    <strong>Etapas</strong>
                    <div>{c.resistencia.quantidade_etapas}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>Controle em etapas</strong>
                    <div>{bool(c.resistencia.controle_em_etapas)}</div>
                  </div>
                  <div className="col-md-4">
                    <strong>PID</strong>
                    <div>{bool(c.resistencia.controle_pid)}</div>
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
                    <strong>Range</strong>
                    <div>{c.sensor.range_medicao || '—'}</div>
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
                    <strong>Precisão</strong>
                    <div>{c.transdutor.precisao || '—'}</div>
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
