import { createContext } from 'react'

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info'

export type ShowToastInput = {
  variant: ToastVariant
  title?: string
  message: string
  /** 0 = sem fechamento automático */
  durationMs?: number
}

export type ToastContextValue = {
  showToast: (input: ShowToastInput) => void
  dismissToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
