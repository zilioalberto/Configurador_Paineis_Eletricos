import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useListboxKeyboardNavigation } from './useListboxKeyboardNavigation'

describe('useListboxKeyboardNavigation', () => {
  it('Enter sem highlight escolhe o primeiro item', () => {
    const items = ['a', 'b']
    const onCommit = vi.fn()
    const { result } = renderHook(() =>
      useListboxKeyboardNavigation(items, { isActive: true, resetKey: '1' }),
    )
    const ev = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as import('react').KeyboardEvent

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
    const ev = {
      key: 'Escape',
      preventDefault: vi.fn(),
    } as unknown as import('react').KeyboardEvent

    act(() => {
      result.current.handleKeyDown(ev, vi.fn(), { onEscape })
    })

    expect(onEscape).toHaveBeenCalled()
  })
})
