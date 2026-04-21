import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

const showToast = vi.hoisted(() => vi.fn())
const fetchTipoUsuarioChoices = vi.hoisted(() => vi.fn())
const fetchUserPermissionOptions = vi.hoisted(() => vi.fn())
const fetchAdminUsers = vi.hoisted(() => vi.fn())
const createAdminUser = vi.hoisted(() => vi.fn())
const updateAdminUser = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('@/modules/usuarios/services/usuariosAdminService', () => ({
  fetchTipoUsuarioChoices: (...args: unknown[]) => fetchTipoUsuarioChoices(...args),
  fetchUserPermissionOptions: (...args: unknown[]) => fetchUserPermissionOptions(...args),
  fetchAdminUsers: (...args: unknown[]) => fetchAdminUsers(...args),
  createAdminUser: (...args: unknown[]) => createAdminUser(...args),
  updateAdminUser: (...args: unknown[]) => updateAdminUser(...args),
}))

import UsuariosAdminPage from '@/modules/usuarios/pages/UsuariosAdminPage'

const tipoUsuarioChoicesBase = [
  { value: 'USUARIO', label: 'Colaborador' },
  { value: 'ADMIN', label: 'Administrador' },
]

const permissionOptionsBase = {
  permissions: [
    { value: 'projeto.visualizar', label: 'Ver projetos' },
    { value: 'projeto.criar', label: 'Criar projetos' },
  ],
  defaults_by_tipo: {
    USUARIO: ['projeto.visualizar'],
    ADMIN: ['projeto.visualizar', 'projeto.criar'],
  },
}

const adminUsersBase = [
  {
    id: 10,
    email: 'tais@empresa.com',
    first_name: 'Tais',
    last_name: '',
    telefone: '',
    tipo_usuario: 'USUARIO',
    permissoes_extras: [],
    permissoes_negadas: [],
    permissoes_efetivas: ['projeto.visualizar'],
    is_active: true,
    date_created: new Date().toISOString(),
  },
]

function renderUsuariosAdminPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <UsuariosAdminPage />
    </QueryClientProvider>
  )
}

function setupUsuariosAdminPage() {
  fetchTipoUsuarioChoices.mockResolvedValue(tipoUsuarioChoicesBase)
  fetchUserPermissionOptions.mockResolvedValue(permissionOptionsBase)
  fetchAdminUsers.mockResolvedValue(adminUsersBase)
  createAdminUser.mockResolvedValue({ id: 11 })
  updateAdminUser.mockResolvedValue({ id: 10 })
}

describe('UsuariosAdminPage', () => {
  it('carrega, cria e edita utilizador', async () => {
    setupUsuariosAdminPage()

    renderUsuariosAdminPage()

    await screen.findByText('Utilizadores registados')
    await screen.findByText('tais@empresa.com')

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'novo@empresa.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha (mín. 8 caracteres)'), {
      target: { value: 'senhaforte123' },
    })
    fireEvent.click(screen.getByLabelText('Criar projetos'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar utilizador' }))

    await waitFor(() => expect(createAdminUser).toHaveBeenCalled())
    expect(createAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'novo@empresa.com',
        password: 'senhaforte123',
      }),
      expect.anything()
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await screen.findByText('Editar utilizador')

    fireEvent.change(screen.getByLabelText('Nova senha (opcional)'), {
      target: { value: 'novasenha123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(updateAdminUser).toHaveBeenCalled())
    expect(updateAdminUser).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        email: 'tais@empresa.com',
        password: 'novasenha123',
      })
    )
  })
})
