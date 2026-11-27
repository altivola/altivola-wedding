import { type ReactNode, useEffect, useRef } from 'react'

/** A native dialog: Escape and the backdrop close it, focus stays inside while it is open. */
export function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    return () => element?.close()
  }, [])
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only closes on the backdrop; Escape is handled by the native cancel event
    <dialog
      ref={dialog}
      className="st-modal"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="st-dialog">{children}</div>
    </dialog>
  )
}
