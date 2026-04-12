import { render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}))

vi.mock('@/modules/auth/refreshAccessToken', () => ({
  refreshAccessToken: vi.fn().mockResolvedValue('refreshed'),
}))

import { AuthProvider, useAuth } from '@/modules/auth/AuthContext'
import { tokenStorage } from '@/modules/auth/tokenStorage'

function StatusProbe() {
  const { status, user } = useAuth()
  return (
    <div data-testid="probe">
      {status}:{user?.email ?? 'none'}
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    tokenStorage.clear()
    getMock.mockReset()
  })

  it('sem tokens fica ready sem utilizador', async () => {
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('ready:none'))
    expect(getMock).not.toHaveBeenCalled()
  })

  it('com access chama auth/me e preenche utilizador', async () => {
    tokenStorage.setTokens('acc', 'ref')
    getMock.mockResolvedValue({
      data: {
        email: 'a@b.com',
        first_name: 'A',
        last_name: 'B',
        tipo_usuario: 'ADM',
      },
    })
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    )
    await waitFor(() => expect(getMock).toHaveBeenCalledWith('auth/me/'))
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('ready:a@b.com'))
  })

  it('401 em auth/me limpa tokens', async () => {
    tokenStorage.setTokens('acc', 'ref')
    const err = new axios.AxiosError('401')
    err.response = { status: 401, data: {}, statusText: '', headers: {}, config: {} as never }
    getMock.mockRejectedValue(err)
    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('ready:none'))
    expect(tokenStorage.getAccess()).toBeNull()
  })
})
