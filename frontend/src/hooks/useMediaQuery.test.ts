import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<EventListenerOrEventListenerObject>()
  let currentMatches = initialMatches
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    get matches() {
      return currentMatches
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener)
    },
    removeEventListener: (_: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener)
    },
    dispatchEvent: vi.fn(),
  }) as MediaQueryList)
  return {
    setMatches(next: boolean) {
      currentMatches = next
      listeners.forEach((listener) => {
        if (typeof listener === 'function') {
          listener(new Event('change'))
          return
        }
        listener.handleEvent(new Event('change'))
      })
    },
  }
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna o estado inicial da media query', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(true)
  })

  it('atualiza quando a media query muda', () => {
    const media = mockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(false)

    act(() => {
      media.setMatches(true)
    })
    expect(result.current).toBe(true)
  })
})
