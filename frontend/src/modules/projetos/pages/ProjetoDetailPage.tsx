import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { obterProjeto } from '../services/projetoService'
import type { Projeto } from '../types/projeto'

function booleanLabel(valor: boolean): string {
  return valor ? 'Sim' : 'Não'
}

function formatarNumeroFases(numeroFases: number | null): string {
  if (numeroFases === null) return '-'
  if (numeroFases === 1) return 'Monofásico'
  if (numeroFases === 2) return 'Bifásico'
  if (numeroFases === 3) return 'Trifásico'
  return String(numeroFases)
}

export default function ProjetoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function carregarProjeto() {
      if (!id) {
        setError('Projeto não informado.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const data = await obterProjeto(id)
        setProjeto(data)
      } catch (err) {
        console.error('Erro ao carregar projeto:', err)
        setError('Não foi possível carregar o projeto.')
      } finally {
        setLoading(false)
      }
    }

    void carregarProjeto()
  }, [id])

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h1 className="h3 mb-1">Detalhes do Projeto</h1>
        <p className="text-muted mb-0">
          Visualização dos dados principais do projeto.
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading && <p className="mb-0">Carregando projeto...</p>}

          {!loading && error && (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && projeto && (
            <div className="row g-4">
              <div className="col-12">
                <h2 className="h5">Dados gerais</h2>
              </div>

              <div className="col-md-3">
                <strong>Código</strong>
                <div>{projeto.codigo}</div>
              </div>

              <div className="col-md-5">
                <strong>Nome</strong>
                <div>{projeto.nome}</div>
              </div>

              <div className="col-md-4">
                <strong>Cliente</strong>
                <div>{projeto.cliente || '-'}</div>
              </div>

              <div className="col-md-3">
                <strong>Status</strong>
                <div>{projeto.status}</div>
              </div>

              <div className="col-md-3">
                <strong>Tipo de painel</strong>
                <div>{projeto.tipo_painel}</div>
              </div>

              <div className="col-md-3">
                <strong>Tipo de corrente</strong>
                <div>{projeto.tipo_corrente}</div>
              </div>

              <div className="col-md-3">
                <strong>Tensão nominal</strong>
                <div>{projeto.tensao_nominal}</div>
              </div>

              <div className="col-md-3">
                <strong>Número de fases</strong>
                <div>{formatarNumeroFases(projeto.numero_fases)}</div>
              </div>

              <div className="col-md-3">
                <strong>Frequência</strong>
                <div>{projeto.frequencia ?? '-'}</div>
              </div>

              <div className="col-md-3">
                <strong>Corrente de comando</strong>
                <div>{projeto.tipo_corrente_comando}</div>
              </div>

              <div className="col-md-3">
                <strong>Tensão de comando</strong>
                <div>{projeto.tensao_comando}</div>
              </div>

              <div className="col-md-3">
                <strong>Fator de demanda</strong>
                <div>{projeto.fator_demanda}</div>
              </div>

              <div className="col-12">
                <strong>Descrição</strong>
                <div>{projeto.descricao || '-'}</div>
              </div>

              <div className="col-12">
                <hr />
                <h2 className="h5">Alimentação</h2>
              </div>

              <div className="col-md-3">
                <strong>Possui neutro</strong>
                <div>{booleanLabel(projeto.possui_neutro)}</div>
              </div>

              <div className="col-md-3">
                <strong>Possui terra</strong>
                <div>{booleanLabel(projeto.possui_terra)}</div>
              </div>

              <div className="col-md-3">
                <strong>Conexão potência</strong>
                <div>{projeto.tipo_conexao_alimentacao_potencia}</div>
              </div>

              <div className="col-md-3">
                <strong>Conexão neutro</strong>
                <div>{projeto.tipo_conexao_alimentacao_neutro ?? '-'}</div>
              </div>

              <div className="col-md-3">
                <strong>Conexão terra</strong>
                <div>{projeto.tipo_conexao_alimentacao_terra ?? '-'}</div>
              </div>

              <div className="col-12">
                <hr />
                <h2 className="h5">Recursos do painel</h2>
              </div>

              <div className="col-md-3">
                <strong>Possui PLC</strong>
                <div>{booleanLabel(projeto.possui_plc)}</div>
              </div>

              <div className="col-md-3">
                <strong>Possui IHM</strong>
                <div>{booleanLabel(projeto.possui_ihm)}</div>
              </div>

              <div className="col-md-3">
                <strong>Possui switches</strong>
                <div>{booleanLabel(projeto.possui_switches)}</div>
              </div>

              <div className="col-md-3">
                <strong>Possui climatização</strong>
                <div>{booleanLabel(projeto.possui_climatizacao)}</div>
              </div>

              <div className="col-md-3">
                <strong>Tipo de climatização</strong>
                <div>{projeto.tipo_climatizacao ?? '-'}</div>
              </div>

              <div className="col-12">
                <hr />
                <h2 className="h5">Identificação e segurança</h2>
              </div>

              <div className="col-md-3">
                <strong>Plaqueta de identificação</strong>
                <div>{booleanLabel(projeto.possui_plaqueta_identificacao)}</div>
              </div>

              <div className="col-md-3">
                <strong>Faixa de identificação</strong>
                <div>{booleanLabel(projeto.possui_faixa_identificacao)}</div>
              </div>

              <div className="col-md-3">
                <strong>Adesivo de alerta</strong>
                <div>{booleanLabel(projeto.possui_adesivo_alerta)}</div>
              </div>

              <div className="col-md-3">
                <strong>Adesivos de tensão</strong>
                <div>{booleanLabel(projeto.possui_adesivos_tensao)}</div>
              </div>

              <div className="col-12">
                <hr />
                <h2 className="h5">Seccionamento</h2>
              </div>

              <div className="col-md-3">
                <strong>Possui seccionamento</strong>
                <div>{booleanLabel(projeto.possui_seccionamento)}</div>
              </div>

              <div className="col-md-3">
                <strong>Tipo de seccionamento</strong>
                <div>{projeto.tipo_seccionamento ?? '-'}</div>
              </div>

              <div className="col-md-3">
                <strong>Criado em</strong>
                <div>{projeto.criado_em ?? '-'}</div>
              </div>

              <div className="col-md-3">
                <strong>Atualizado em</strong>
                <div>{projeto.atualizado_em ?? '-'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}