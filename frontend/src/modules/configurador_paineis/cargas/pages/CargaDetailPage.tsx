/** Visualização somente leitura da carga e bloco específico por tipo. */

import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useProjetoListQuery } from '@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { useCargaDetailQuery } from '../hooks/useCargaDetailQuery'
import { CargaDetailTipoEspecifico } from '../components/CargaDetailTipoSections'
import { projetoPermiteEdicaoCargas } from '../utils/projetoEdicaoCargas'

function bool(v: boolean | undefined): string {
  return v ? 'Sim' : 'Não'
}

type LocationState = { from?: string }

function hrefListaCargasSeguro(state: unknown, projetoId: string | undefined): string {
  const from = (state as LocationState | null)?.from
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from
  }
  if (projetoId) {
    return configuradorPaths.cargas(projetoId)
  }
  return configuradorPaths.cargas()
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

  const editarHref = useMemo(() => {
    if (!id || !c?.projeto) return configuradorPaths.cargas()
    return configuradorPaths.cargasEditar(c.projeto, id)
  }, [c, id])

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
              <Link to={editarHref} className="btn btn-primary">
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

              <CargaDetailTipoEspecifico c={c} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
