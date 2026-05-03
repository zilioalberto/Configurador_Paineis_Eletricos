import { type KeyboardEvent, useCallback, useEffect, useState } from 'react'

export type ListboxKeyboardCommit<T> = (item: T) => void

type Options = {
  /** Quando true, setas / Enter / Escape tratam a lista. */
  isActive: boolean
  /** Alterar para limpar o destaque (ex.: novo termo de busca). */
  resetKey?: string | number
}

/**
 * Navegação por teclado em listbox (setas, Enter, Escape) para comboboxes / typeahead.
 */
export function useListboxKeyboardNavigation<T>(
  items: readonly T[],
  { isActive, resetKey = 0 }: Options,
) {
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    setActiveIndex(-1)
  }, [isActive, resetKey, items.length])

  const handleKeyDown = useCallback(
    (
      event: KeyboardEvent,
      onCommit: ListboxKeyboardCommit<T>,
      callbacks?: { onEscape?: () => void },
    ) => {
      if (!isActive || items.length === 0) {
        return
      }

      const len = items.length

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((prev) => (prev < len - 1 ? prev + 1 : 0))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : len - 1))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const idx = activeIndex >= 0 ? activeIndex : 0
        const item = items[idx]
        if (item !== undefined) {
          onCommit(item)
        }
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setActiveIndex(-1)
        callbacks?.onEscape?.()
      }
    },
    [isActive, items, activeIndex],
  )

  return { activeIndex, setActiveIndex, handleKeyDown }
}
