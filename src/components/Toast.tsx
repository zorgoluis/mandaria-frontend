import { useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { Button } from './controls'

export function Toast({
  message,
  danger = false,
  onDismiss,
  duration = danger ? null : 7000,
}: {
  message: ReactNode
  danger?: boolean
  onDismiss: () => void
  duration?: number | null
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (duration === null || hovered || focused) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, hovered, focused, onDismiss])
  return (
    <div
      className={`toast ui-toast ${danger ? 'danger' : ''}`}
      role={danger ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
    >
      {danger ? (
        <CircleAlert className="ui-icon" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="ui-icon" aria-hidden="true" />
      )}
      <span>{message}</span>
      <Button
        variant="ghost"
        className="icon-button"
        aria-label="Cerrar notificación"
        onClick={onDismiss}
      >
        <X className="ui-icon" aria-hidden="true" />
      </Button>
    </div>
  )
}
