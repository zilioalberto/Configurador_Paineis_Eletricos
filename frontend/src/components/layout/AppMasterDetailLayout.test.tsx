import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppMasterDetailLayout from './AppMasterDetailLayout'

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(),
}))

import { useMediaQuery } from '@/hooks/useMediaQuery'

const useMediaQueryMock = vi.mocked(useMediaQuery)

describe('AppMasterDetailLayout', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('mostra lista e detalhe lado a lado no desktop', () => {
    useMediaQueryMock.mockReturnValue(false)

    render(
      <AppMasterDetailLayout
        showDetail
        onBackToList={() => undefined}
        list={<div>Lista</div>}
        detail={<div>Detalhe</div>}
      />
    )

    expect(screen.getByText('Lista')).toBeInTheDocument()
    expect(screen.getByText('Detalhe')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /voltar à lista/i })).not.toBeInTheDocument()
  })

  it('mostra só a lista no mobile quando nenhum detalhe está aberto', () => {
    useMediaQueryMock.mockReturnValue(true)

    render(
      <AppMasterDetailLayout
        showDetail={false}
        onBackToList={() => undefined}
        list={<div>Lista</div>}
        detail={<div>Detalhe</div>}
      />
    )

    expect(screen.getByText('Lista')).toBeInTheDocument()
    expect(screen.queryByText('Detalhe')).not.toBeInTheDocument()
  })

  it('mostra detalhe com voltar no mobile quando showDetail é true', () => {
    useMediaQueryMock.mockReturnValue(true)
    const onBack = vi.fn()

    render(
      <AppMasterDetailLayout
        showDetail
        onBackToList={onBack}
        list={<div>Lista</div>}
        detail={<div>Detalhe</div>}
      />
    )

    expect(screen.queryByText('Lista')).not.toBeInTheDocument()
    expect(screen.getByText('Detalhe')).toBeInTheDocument()
    screen.getByRole('button', { name: /voltar à lista/i }).click()
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
