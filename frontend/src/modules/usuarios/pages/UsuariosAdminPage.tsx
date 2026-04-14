import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useCallback, useMemo, useState } from 'react'

import { useToast } from '@/components/feedback'
import type { AdminUserDto, AdminUserUpdatePayload } from '@/modules/usuarios/types'
import {
  createAdminUser,
  fetchAdminUsers,
  fetchTipoUsuarioChoices,
  updateAdminUser,
} from '@/modules/usuarios/services/usuariosAdminService'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

const emptyCreate = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  telefone: '',
  tipo_usuario: 'USUARIO',
  is_active: true,
}

export default function UsuariosAdminPage() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [createForm, setCreateForm] = useState({ ...emptyCreate })
  const [editTarget, setEditTarget] = useState<AdminUserDto | null>(null)
  const [editForm, setEditForm] = useState<AdminUserUpdatePayload | null>(null)

  const { data: tipos = [] } = useQuery({
    queryKey: ['auth', 'user-tipo-choices'],
    queryFn: fetchTipoUsuarioChoices,
  })

  const {
    data: users = [],
    isPending: loadingUsers,
    isError: loadUsersError,
    error: usersError,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: fetchAdminUsers,
  })

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'users'] })
      setCreateForm({ ...emptyCreate })
      showToast({ variant: 'success', message: 'Utilizador criado com sucesso.' })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'Não foi possível criar',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminUserUpdatePayload }) =>
      updateAdminUser(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'users'] })
      setEditTarget(null)
      setEditForm(null)
      showToast({ variant: 'success', message: 'Utilizador atualizado.' })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'Não foi possível guardar',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    },
  })

  const defaultTipo = useMemo(() => tipos[0]?.value ?? 'USUARIO', [tipos])

  const onCreateSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const tipo = createForm.tipo_usuario || defaultTipo
      createMutation.mutate({
        email: createForm.email.trim(),
        password: createForm.password,
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        telefone: createForm.telefone.trim(),
        tipo_usuario: tipo,
        is_active: createForm.is_active,
      })
    },
    [createForm, createMutation, defaultTipo]
  )

  const openEdit = useCallback((u: AdminUserDto) => {
    setEditTarget(u)
    setEditForm({
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      telefone: u.telefone ?? '',
      tipo_usuario: u.tipo_usuario,
      is_active: u.is_active,
      password: '',
    })
  }, [])

  const closeEdit = useCallback(() => {
    setEditTarget(null)
    setEditForm(null)
  }, [])

  const onEditSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!editTarget || !editForm) return
      updateMutation.mutate({ id: editTarget.id, payload: editForm })
    },
    [editForm, editTarget, updateMutation]
  )

  const tipoOptions = tipos.length > 0 ? tipos : [
    { value: 'USUARIO', label: 'Usuário' },
    { value: 'ADMIN', label: 'Administrador' },
  ]

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Utilizadores</h1>
          <p className="text-muted small mb-0">
            Crie contas e defina o tipo de cada utilizador. Os acessos por módulo podem ser
            refinados no código conforme o <code>tipo_usuario</code>.
          </p>
        </div>
      </div>

      {loadUsersError ? (
        <div className="alert alert-danger" role="alert">
          {extrairMensagemErroApi(usersError) || 'Não foi possível carregar a lista.'}
          <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h2 className="h5 card-title">Novo utilizador</h2>
          <p className="text-muted small">
            O utilizador recebe estes dados e inicia sessão com o e-mail e a senha definidos.
          </p>
          <form onSubmit={onCreateSubmit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label" htmlFor="nu-email">
                E-mail
              </label>
              <input
                id="nu-email"
                className="form-control"
                type="email"
                autoComplete="off"
                value={createForm.email}
                onChange={(ev) => setCreateForm((s) => ({ ...s, email: ev.target.value }))}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="nu-password">
                Senha (mín. 8 caracteres)
              </label>
              <input
                id="nu-password"
                className="form-control"
                type="password"
                autoComplete="new-password"
                value={createForm.password}
                onChange={(ev) => setCreateForm((s) => ({ ...s, password: ev.target.value }))}
                required
                minLength={8}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="nu-tipo">
                Tipo de utilizador
              </label>
              <select
                id="nu-tipo"
                className="form-select"
                value={createForm.tipo_usuario || defaultTipo}
                onChange={(ev) => setCreateForm((s) => ({ ...s, tipo_usuario: ev.target.value }))}
                disabled={createMutation.isPending}
              >
                {tipoOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="nu-fn">
                Nome
              </label>
              <input
                id="nu-fn"
                className="form-control"
                value={createForm.first_name}
                onChange={(ev) => setCreateForm((s) => ({ ...s, first_name: ev.target.value }))}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="nu-ln">
                Sobrenome
              </label>
              <input
                id="nu-ln"
                className="form-control"
                value={createForm.last_name}
                onChange={(ev) => setCreateForm((s) => ({ ...s, last_name: ev.target.value }))}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="nu-tel">
                Telefone
              </label>
              <input
                id="nu-tel"
                className="form-control"
                value={createForm.telefone}
                onChange={(ev) => setCreateForm((s) => ({ ...s, telefone: ev.target.value }))}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check">
                <input
                  id="nu-active"
                  type="checkbox"
                  className="form-check-input"
                  checked={createForm.is_active}
                  onChange={(ev) => setCreateForm((s) => ({ ...s, is_active: ev.target.checked }))}
                  disabled={createMutation.isPending}
                />
                <label className="form-check-label" htmlFor="nu-active">
                  Conta ativa
                </label>
              </div>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando…' : 'Criar utilizador'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 card-title">Utilizadores registados</h2>
          {loadingUsers ? (
            <p className="text-muted small mb-0">Carregando…</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Ativo</th>
                    <th>Criado em</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>
                        {[u.first_name, u.last_name].filter(Boolean).join(' ').trim() || (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge text-bg-secondary">{u.tipo_usuario}</span>
                      </td>
                      <td>{u.is_active ? 'Sim' : 'Não'}</td>
                      <td className="text-muted small">
                        {u.date_created
                          ? new Date(u.date_created).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openEdit(u)}
                        >
                          Editar
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

      {editTarget && editForm ? (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h2 id="edit-user-title" className="modal-title h5">
                  Editar utilizador
                </h2>
                <button type="button" className="btn-close" aria-label="Fechar" onClick={closeEdit} />
              </div>
              <form onSubmit={onEditSubmit}>
                <div className="modal-body row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="ed-email">
                      E-mail
                    </label>
                    <input
                      id="ed-email"
                      className="form-control"
                      type="email"
                      value={editForm.email}
                      onChange={(ev) => setEditForm((s) => (s ? { ...s, email: ev.target.value } : s))}
                      required
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="ed-pw">
                      Nova senha (opcional)
                    </label>
                    <input
                      id="ed-pw"
                      className="form-control"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Deixe em branco para manter"
                      value={editForm.password ?? ''}
                      onChange={(ev) =>
                        setEditForm((s) => (s ? { ...s, password: ev.target.value } : s))
                      }
                      minLength={8}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="ed-fn">
                      Nome
                    </label>
                    <input
                      id="ed-fn"
                      className="form-control"
                      value={editForm.first_name}
                      onChange={(ev) =>
                        setEditForm((s) => (s ? { ...s, first_name: ev.target.value } : s))
                      }
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="ed-ln">
                      Sobrenome
                    </label>
                    <input
                      id="ed-ln"
                      className="form-control"
                      value={editForm.last_name}
                      onChange={(ev) =>
                        setEditForm((s) => (s ? { ...s, last_name: ev.target.value } : s))
                      }
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="ed-tel">
                      Telefone
                    </label>
                    <input
                      id="ed-tel"
                      className="form-control"
                      value={editForm.telefone}
                      onChange={(ev) =>
                        setEditForm((s) => (s ? { ...s, telefone: ev.target.value } : s))
                      }
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="ed-tipo">
                      Tipo de utilizador
                    </label>
                    <select
                      id="ed-tipo"
                      className="form-select"
                      value={editForm.tipo_usuario}
                      onChange={(ev) =>
                        setEditForm((s) => (s ? { ...s, tipo_usuario: ev.target.value } : s))
                      }
                      disabled={updateMutation.isPending}
                    >
                      {tipoOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
                    <div className="form-check">
                      <input
                        id="ed-active"
                        type="checkbox"
                        className="form-check-input"
                        checked={editForm.is_active}
                        onChange={(ev) =>
                          setEditForm((s) => (s ? { ...s, is_active: ev.target.checked } : s))
                        }
                        disabled={updateMutation.isPending}
                      />
                      <label className="form-check-label" htmlFor="ed-active">
                        Conta ativa
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeEdit}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
