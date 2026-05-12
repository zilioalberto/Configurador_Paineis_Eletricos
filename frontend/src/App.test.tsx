import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/router/AppRouter', () => ({
  default: () => <span>Router renderizado</span>,
}))

import App from './App'

describe('App', () => {
  it('renderiza o roteador principal', () => {
    render(<App />)

    expect(screen.getByText('Router renderizado')).toBeInTheDocument()
  })
})
