import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { ProjetoFluxoHeaderSteps } from './ProjetoFluxoHeaderSteps'

const useProjetoFluxoGatesMock = vi.hoisted(() =>
  vi.fn(() => ({
    loading: false,
    temCargas: true,
    condutoresRevisaoOk: false,
    podeAcessarDimensionamento: true,
    podeAcessarComposicao: false,
  }))
)

vi.mock('../hooks/useProjetoFluxoGates', () => ({
  useProjetoFluxoGates: (...args: unknown[]) => useProjetoFluxoGatesMock(...args),
}))

describe('ProjetoFluxoHeaderSteps', () => {
  it('renderiza etapas do fluxo com etapa atual destacada', () => {
    render(
      <MemoryRouter initialEntries={['/configurador/configuracoes/p1/fluxo/cargas']}>
        <ProjetoFluxoHeaderSteps projetoId="p1" etapaAtual="cargas" />
      </MemoryRouter>
    )

    expect(screen.getByRole('navigation', { name: /etapas do fluxo/i })).toBeInTheDocument()
    expect(useProjetoFluxoGatesMock).toHaveBeenCalledWith('p1')
    expect(screen.getByRole('link', { name: /cargas/i })).toHaveAttribute('aria-current', 'step')
  })

  it('mostra etapa bloqueada como span quando gate não liberado', () => {
    useProjetoFluxoGatesMock.mockReturnValueOnce({
      loading: false,
      temCargas: true,
      condutoresRevisaoOk: false,
      podeAcessarDimensionamento: false,
      podeAcessarComposicao: false,
    })

    render(
      <MemoryRouter>
        <ProjetoFluxoHeaderSteps projetoId="p1" etapaAtual="cargas" />
      </MemoryRouter>
    )

    const dimensionamento = screen.getByText('Dimensionamento')
    expect(dimensionamento.tagName).toBe('SPAN')
    expect(dimensionamento).toHaveAttribute('aria-disabled')
  })
})
