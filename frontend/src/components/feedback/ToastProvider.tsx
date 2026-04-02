import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ToastContext,
  type ShowToastInput,
  type ToastVariant,
} from './toastContext'

type ToastItem = ShowToastInput & { id: string }

const VARIANT_BORDER: Record<ToastVariant, string> = {
  success: 'border-success',
  danger: 'border-danger',
  warning: 'border-warning',
  info: 'border-info',
}

function ToastItemView({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: () => void
}) {
  return (
    <div
      className={`toast show border-start border-4 ${VARIANT_BORDER[toast.variant]}`}
      role="status"
      aria-live="polite"
    >
      <div className="d-flex">
        <div className="toast-body py-3 px-3">
          {toast.title ? (
            <>
              <div className="fw-semibold mb-1">{toast.title}</div>
              <div>{toast.message}</div>
            </>
          ) : (
            toast.message
          )}
        </div>
        <button
          type="button"
          className="btn-close me-3 mt-3 flex-shrink-0"
          onClick={onDismiss}
          aria-label="Fechar notificação"
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((input: ShowToastInput) => {
    const id = crypto.randomUUID()
    const durationMs = input.durationMs ?? 5000

    setToasts((prev) => [...prev, { ...input, id }])

    if (durationMs > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, durationMs)
    }
  }, [])

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1080 }}
      >
        {toasts.map((t) => (
          <ToastItemView
            key={t.id}
            toast={t}
            onDismiss={() => dismissToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
