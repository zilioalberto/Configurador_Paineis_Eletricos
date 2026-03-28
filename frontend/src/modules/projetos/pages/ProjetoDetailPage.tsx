import { Link, useParams } from 'react-router-dom'
import { useProjetoDetailQuery } from '../hooks/useProjetoDetailQuery'
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

function formatarTipoCorrente(tipoCorrente: string): string {
  if (tipoCorrente === 'CA') return 'Corrente Alternada (CA)'
  if (tipoCorrente === 'CC') return 'Corrente Contínua (CC)'
  return tipoCorrente
}

function ProjetoDetalheConteudo({ projeto }: { projeto: Projeto }) {
  return (
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
        <div>{projeto.status_display ?? projeto.status}</div>
      </div>

      <div className="col-md-3">
        <strong>Tipo de painel</strong>
        <div>{projeto.tipo_painel_display ?? projeto.tipo_painel}</div>
      </div>

      <div className="col-md-3">
        <strong>Tipo de corrente</strong>
        <div>{formatarTipoCorrente(projeto.tipo_corrente)}</div>
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
        <div>{formatarTipoCorrente(projeto.tipo_corrente_comando)}</div>
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
        <div>
          {projeto.tipo_conexao_alimentacao_potencia_display ??
            projeto.tipo_conexao_alimentacao_potencia}
        </div>
      </div>

      <div className="col-md-3">
        <strong>Conexão neutro</strong>
        <div>
          {projeto.tipo_conexao_alimentacao_neutro_display ??
            projeto.tipo_conexao_alimentacao_neutro ??
            '-'}
        </div>
      </div>

      <div className="col-md-3">
        <strong>Conexão terra</strong>
        <div>
          {projeto.tipo_conexao_alimentacao_terra_display ??
            projeto.tipo_conexao_alimentacao_terra ??
            '-'}
        </div>
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
        <div>
          {projeto.tipo_climatizacao_display ??
            projeto.tipo_climatizacao ??
            '-'}
        </div>
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
        <div>
          {projeto.tipo_seccionamento_display ??
            projeto.tipo_seccionamento ??
            '-'}
        </div>
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
  )
}

export default function ProjetoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: projeto, isPending, isError, error: loadError } =
    useProjetoDetailQuery(id)

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Detalhes do Projeto</h1>
          <p className="text-muted mb-0">
            Visualização dos dados principais do projeto.
          </p>
        </div>
        {id && (
          <div className="d-flex flex-wrap gap-2">
            <Link
              to={`/cargas?projeto=${encodeURIComponent(id)}`}
              className="btn btn-outline-primary"
            >
              Cargas do projeto
            </Link>
            <Link to={`/projetos/${id}/editar`} className="btn btn-primary">
              Editar projeto
            </Link>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          {!id && (
            <div className="alert alert-danger mb-0" role="alert">
              Projeto não informado.
            </div>
          )}

          {id && isPending && (
            <p className="mb-0">Carregando projeto...</p>
          )}

          {id && !isPending && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {loadError instanceof Error
                ? loadError.message
                : 'Não foi possível carregar o projeto.'}
            </div>
          )}

          {id && !isPending && !isError && projeto && (
            <ProjetoDetalheConteudo projeto={projeto} />
          )}
        </div>
      </div>
    </div>
  )
}
