import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToastMock = vi.hoisted(() => vi.fn())
const sincronizarMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'u@test.com', tipo_usuario: 'ADMIN', permissoes: [] },
  }),
}))

vi.mock('@/modules/auth/permissions', () => ({
  hasPermission: () => true,
}))

vi.mock('../services/fiscalNfeService', () => ({
  sincronizarNfesSefaz: sincronizarMock,
}))

import { ApiError } from '@/services/http/ApiError'

import SincronizarNfesSefazButton from './SincronizarNfesSefazButton'

function renderButton() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SincronizarNfesSefazButton cnpj="11222333000199" />
    </QueryClientProvider>
  )
}

describe('SincronizarNfesSefazButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sincronizarMock.mockResolvedValue({
      sucesso: true,
      mensagem: 'Sincronização concluída',
      ciclos_executados: 1,
      documentos_importados: 1,
      documentos_novos: 1,
      documentos_duplicados: 0,
      erros_importacao: [],
      ultimo_cstat: '138',
      ultimo_nsu: '000000000000001',
      max_nsu: '000000000000001',
      manifestacoes_processadas: 0,
    })
  })

  it('dispara sincronização e exibe toast de sucesso', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /buscar nf-es na sefaz/i }))

    await waitFor(() => expect(sincronizarMock).toHaveBeenCalledTimes(1))
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Sincronização concluída' }),
    )
  })

  it('exibe toast de erro com cStat quando sync falha', async () => {
    sincronizarMock.mockRejectedValueOnce(
      new ApiError('Certificado inválido', {
        status: 422,
        details: {
          sucesso: false,
          mensagem: 'Certificado digital inválido ou não reconhecido pela SEFAZ.',
          ultimo_cstat: '280',
          ultimo_motivo: 'Certificado inválido',
          alertas: ['SEFAZ cStat 280: Certificado inválido'],
          erros_importacao: [],
          ciclos_executados: 1,
          documentos_importados: 0,
          documentos_novos: 0,
          documentos_duplicados: 0,
          ultimo_nsu: '0',
          max_nsu: '0',
          manifestacoes_processadas: 0,
          detail: 'Certificado digital inválido SEFAZ cStat 280 — Certificado inválido',
        },
      }),
    )

    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /buscar nf-es na sefaz/i }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'danger', title: 'Falha na sincronização' }),
      ),
    )
  })
})
