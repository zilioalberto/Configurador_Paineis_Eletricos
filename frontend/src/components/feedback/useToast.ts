import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from './toastContext'

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }
  return ctx
}
