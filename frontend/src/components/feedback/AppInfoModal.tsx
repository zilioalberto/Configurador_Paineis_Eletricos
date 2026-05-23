import { useEffect, type ReactNode } from 'react'

export type AppInfoModalProps = Readonly<{
  show: boolean
  title: string
  titleId?: string
  children: ReactNode
  onClose: () => void
}>

export function AppInfoModal({
  show,
  title,
  titleId = 'app-info-modal-title',
  children,
  onClose,
}: AppInfoModalProps) {
  useEffect(() => {
    if (!show) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [show, onClose])

  if (!show) {
    return null
  }

  return (
    <>
      <dialog
        open
        className="modal fade show d-block"
        style={{ zIndex: 1060 }}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable px-2">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id={titleId} className="modal-title h5 mb-0">
                {title}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Fechar"
              />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </dialog>
      <button
        type="button"
        className="modal-backdrop fade show"
        style={{ zIndex: 1055 }}
        aria-label="Fechar"
        onClick={onClose}
      />
    </>
  )
}
