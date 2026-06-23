import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authUser } from '@/test/factories/authUser'

const showToastMock = vi.hoisted(() => vi.fn())
const sincronizarNfseAdnMock = vi.hoisted(() => vi.fn())
const userRef = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({ user: userRef.current }),
}))

vi.mock('../services/fiscalNfseRecebidaService', () => ({
  sincronizarNfseAdn: (...args: unknown[]) => sincronizarNfseAdnMock(...args),
}))

import SincronizarNfseAdnButton from './SincronizarNfseAdnButton'

function renderButton(props: Record<string, unknown> = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <SincronizarNfseAdnButton cnpj="07284171000139" {...props} />
    </QueryClientProvider>,
  )
}

describe('SincronizarNfseAdnButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.current = authUser(['fiscal.editar'])
    sincronizarNfseAdnMock.mockResolvedValue({
      sucesso: true,
      mensagem: 'ADN consultado',
      documentos_novos: 3,
      documentos_duplicados: 0,
      documentos_importados: 3,
      erros_importacao: [],
    })
  })

  it('não renderiza nada sem permissão de edição', () => {
    userRef.current = authUser([])
    const { container } = renderButton()
    expect(container.querySelector('button')).toBeNull()
  })

  it('sincroniza e mostra toast de sucesso com detalhe', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar NFS-e no ADN' }))

    await waitFor(() => expect(sincronizarNfseAdnMock).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'success',
          message: expect.stringContaining('3 nova(s) NFS-e(s).'),
        }),
      ),
    )
  })

  it('mostra toast de erro quando a sincronização falha', async () => {
    sincronizarNfseAdnMock.mockRejectedValue(new Error('ADN indisponível'))
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar NFS-e no ADN' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'danger' }),
      ),
    )
  })

  it('aplica a classe btn-sm quando size="sm"', () => {
    renderButton({ size: 'sm' })
    expect(screen.getByRole('button', { name: 'Buscar NFS-e no ADN' })).toHaveClass('btn-sm')
  })
})
