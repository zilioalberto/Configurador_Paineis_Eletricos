import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useListboxKeyboardNavigation } from './useListboxKeyboardNavigation'

function keyEv(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as import('react').KeyboardEvent
}

describe('useListboxKeyboardNavigation', () => {
  it('Enter sem highlight escolhe o primeiro item', () => {
    const items = ['a', 'b']
    const onCommit = vi.fn()
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(items, { isActive: true, resetKey: '1' }),
    )
    const ev = keyEv('Enter')

    act(() => {
      result.current.handleKeyDown(ev, onCommit)
    })

    expect(ev.preventDefault).toHaveBeenCalled()
    expect(onCommit).toHaveBeenCalledWith('a')
  })

  it('Escape chama onEscape', () => {
    const items = ['x']
    const onEscape = vi.fn()
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(items, { isActive: true, resetKey: '2' }),
    )
    const ev = keyEv('Escape')

    act(() => {
      result.current.handleKeyDown(ev, vi.fn(), { onEscape })
    })

    expect(onEscape).toHaveBeenCalled()
  })

  it('não faz nada quando isActive é false', () => {
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(['a'], { isActive: false, resetKey: 'x' }),
    )
    const ev = keyEv('Enter')
    act(() => {
      result.current.handleKeyDown(ev, vi.fn())
    })
    expect(ev.preventDefault).not.toHaveBeenCalled()
  })

  it('não faz nada quando a lista está vazia', () => {
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation([], { isActive: true, resetKey: 'y' }),
    )
    const ev = keyEv('ArrowDown')
    act(() => {
      result.current.handleKeyDown(ev, vi.fn())
    })
    expect(ev.preventDefault).not.toHaveBeenCalled()
  })

  it('ArrowDown reposiciona do último para o primeiro', () => {
    const items = ['a', 'b']
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(items, { isActive: true, resetKey: 'z' }),
    )
    act(() => {
      result.current.setActiveIndex(1)
    })
    const ev = keyEv('ArrowDown')
    act(() => {
      result.current.handleKeyDown(ev, vi.fn())
    })
    expect(result.current.activeIndex).toBe(0)
  })

  it('ArrowUp envolve do primeiro para o último', () => {
    const items = ['a', 'b', 'c']
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(items, { isActive: true, resetKey: 'w' }),
    )
    act(() => {
      result.current.setActiveIndex(0)
    })
    const ev = keyEv('ArrowUp')
    act(() => {
      result.current.handleKeyDown(ev, vi.fn())
    })
    expect(result.current.activeIndex).toBe(2)
  })

  it('Enter com índice activo escolhe esse item', () => {
    const items = ['a', 'b']
    const onCommit = vi.fn()
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(items, { isActive: true, resetKey: 'v' }),
    )
    act(() => {
      result.current.setActiveIndex(1)
    })
    const ev = keyEv('Enter')
    act(() => {
      result.current.handleKeyDown(ev, onCommit)
    })
    expect(onCommit).toHaveBeenCalledWith('b')
  })

  it('Escape sem onEscape apenas limpa destaque', () => {
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(['x'], { isActive: true, resetKey: 'u' }),
    )
    act(() => {
      result.current.setActiveIndex(0)
    })
    const ev = keyEv('Escape')
    act(() => {
      result.current.handleKeyDown(ev, vi.fn())
    })
    expect(result.current.activeIndex).toBe(-1)
  })
})
