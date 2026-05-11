import { useQueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { QueryProvider } from './QueryProvider'

function Probe() {
  const queryClient = useQueryClient()
  const queryDefaults = queryClient.getDefaultOptions().queries
  return (
    <div>
      <span>Provider ativo</span>
      <span>stale {String(queryDefaults?.staleTime)}</span>
      <span>retry {String(queryDefaults?.retry)}</span>
    </div>
  )
}

describe('QueryProvider', () => {
  it('fornece QueryClient com defaults da aplicação', () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>
    )

    expect(screen.getByText('Provider ativo')).toBeInTheDocument()
    expect(screen.getByText('stale 60000')).toBeInTheDocument()
    expect(screen.getByText('retry 1')).toBeInTheDocument()
  })
})
