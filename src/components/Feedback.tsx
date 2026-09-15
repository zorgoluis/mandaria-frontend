import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, X, CircleAlert } from 'lucide-react'
import { FeedbackContext } from './feedback-context'
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{
    message: string
    danger: boolean
  } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify = useCallback((message: string, danger = false) => {
    clearTimeout(timer.current)
    setNotice({ message, danger })
    timer.current = setTimeout(() => setNotice(null), 7000)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      {notice && (
        <div
          className={`toast ${notice.danger ? 'danger' : ''}`}
          role={notice.danger ? 'alert' : 'status'}
        >
          {notice.danger ? (
            <CircleAlert size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
          <span>{notice.message}</span>
          <button
            className="icon-button"
            aria-label="Cerrar notificación"
            onClick={() => setNotice(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}
