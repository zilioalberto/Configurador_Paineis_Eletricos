import { type ChangeEvent, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProjetoTable from '../components/ProjetoTable'
import { useProjetoListQuery } from '../hooks/useProjetoListQuery'
import { useDeleteProjetoMutation } from '../hooks/useProjetoMutations'

type DeleteTarget = {
  id: string
  label: string
}

export default function ProjetoListPage() {
  const { user } = useAuth()
  const {
    data: projetos = [],
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useProjetoListQuery()
  const deleteMutation = useDeleteProjetoMutation()
  const { showToast } = useToast()

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [filtroCodigo, setFiltroCodigo] = useState('')
  const [filtroNome, setFiltroNome] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)
  const canEditProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
  const canDeleteProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_EXCLUIR)

  const projetosFiltrados = useMemo(() => {
    const termoCodigo = filtroCodigo.trim().toLocaleLowerCase()
    const termoNome = filtroNome.trim().toLocaleLowerCase()
    const termoCliente = filtroCliente.trim().toLocaleLowerCase()
    const termoResponsavel = filtroResponsavel.trim().toLocaleLowerCase()
    const status = filtroStatus.trim()

    return projetos.filter((projeto) => {
      if (termoCodigo && !(projeto.codigo || '').toLocaleLowerCase().includes(termoCodigo)) return false
      if (termoNome && !(projeto.nome || '').toLocaleLowerCase().includes(termoNome)) return false
      if (termoCliente && !(projeto.cliente || '').toLocaleLowerCase().includes(termoCliente)) return false
      if (
        termoResponsavel &&
        !(projeto.responsavel_nome || '').toLocaleLowerCase().includes(termoResponsavel)
      ) {
        return false
      }
      if (status && projeto.status !== status) return false
      return true
    })
  }, [filtroCodigo, filtroNome, filtroCliente, filtroResponsavel, filtroStatus, projetos])

  const onFiltroCodigoChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFiltroCodigo(event.target.value)
  }, [])

  const onFiltroNomeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFiltroNome(event.target.value)
  }, [])

  const onFiltroClienteChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFiltroCliente(event.target.value)
  }, [])

  const onFiltroStatusChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setFiltroStatus(event.target.value)
  }, [])

  const onLimparFiltros = useCallback(() => {
    setFiltroCodigo('')
    setFiltroNome('')
    setFiltroCliente('')
    setFiltroResponsavel('')
    setFiltroStatus('')
  }, [])

  const onFiltroResponsavelChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFiltroResponsavel(event.target.value)
    },
    []
  )

  const onDeleteRequest = useCallback(
    (id: string) => {
      const projeto = projetos.find((p) => p.id === id)
      const label =
        projeto?.nome?.trim() ||
        projeto?.codigo?.trim() ||
        'este projeto'
      setDeleteTarget({ id, label })
    },
    [projetos]
  )

  const closeModal = useCallback(() => {
    if (!deleteMutation.isPending) {
      setDeleteTarget(null)
    }
  }, [deleteMutation.isPending])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      showToast({
        variant: 'success',
        message: 'Projeto excluído com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao excluir projeto:', err)
      setDeleteTarget(null)
      const mensagem = extrairMensagemErroApi(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: mensagem || 'Tente novamente em instantes.',
      })
    }
  }, [deleteTarget, deleteMutation, showToast])

  return (
    <div className="container-fluid">
      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir projeto"
        message={
          deleteTarget
            ? `Deseja realmente excluir "${deleteTarget.label}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onCancel={closeModal}
        onConfirm={() => void confirmDelete()}
      />

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Projetos</h1>
          <p className="text-muted mb-0">
            Gerencie os projetos do configurador de painéis.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void refetch()}
          >
            Atualizar
          </button>

          {canCreateProjeto ? (
            <Link to="/projetos/novo" className="btn btn-primary">
              Novo Projeto
            </Link>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label fw-semibold mb-1" htmlFor="filtro-codigo-projeto">
                Buscar por código
              </label>
              <input
                id="filtro-codigo-projeto"
                type="text"
                className="form-control"
                placeholder="Ex.: 04001-26"
                value={filtroCodigo}
                onChange={onFiltroCodigoChange}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label fw-semibold mb-1" htmlFor="filtro-nome-projeto">
                Buscar por nome
              </label>
              <input
                id="filtro-nome-projeto"
                type="text"
                className="form-control"
                placeholder="Nome do projeto"
                value={filtroNome}
                onChange={onFiltroNomeChange}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label fw-semibold mb-1" htmlFor="filtro-cliente-projeto">
                Buscar por cliente
              </label>
              <input
                id="filtro-cliente-projeto"
                type="text"
                className="form-control"
                placeholder="Nome do cliente"
                value={filtroCliente}
                onChange={onFiltroClienteChange}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label fw-semibold mb-1" htmlFor="filtro-status-projeto">
                Filtrar por status
              </label>
              <select
                id="filtro-status-projeto"
                className="form-select"
                value={filtroStatus}
                onChange={onFiltroStatusChange}
              >
                <option value="">Todos</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label fw-semibold mb-1" htmlFor="filtro-responsavel-projeto">
                Buscar por responsável
              </label>
              <input
                id="filtro-responsavel-projeto"
                type="text"
                className="form-control"
                placeholder="Digite o nome do responsável"
                value={filtroResponsavel}
                onChange={onFiltroResponsavelChange}
              />
            </div>
            <div className="col-12 col-md">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <p className="small text-muted mb-0">
                  {projetosFiltrados.length} projeto(s) exibido(s).
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={onLimparFiltros}
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          </div>

          {isPending && <p className="mb-0">Carregando projetos...</p>}

          {!isPending && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {loadError instanceof Error
                ? loadError.message
                : 'Não foi possível carregar os projetos.'}
            </div>
          )}

          {!isPending && !isError && (
            <ProjetoTable
              projetos={projetosFiltrados}
              onDeleteRequest={onDeleteRequest}
              canEdit={canEditProjeto}
              canDelete={canDeleteProjeto}
            />
          )}
        </div>
      </div>
    </div>
  )
}
