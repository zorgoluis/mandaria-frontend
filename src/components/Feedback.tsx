import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Toast } from './Toast'
import { FeedbackContext } from './feedback-context'
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{
    id: number
    message: string
    danger: boolean
  } | null>(null)
  const sequence = useRef(0)
  const notify = useCallback((message: string, danger = false) => {
    setNotice({ id: ++sequence.current, message, danger })
  }, [])
  const dismiss = useCallback(() => setNotice(null), [])
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      {notice && (
        <Toast
          key={notice.id}
          message={notice.message}
          danger={notice.danger}
          onDismiss={dismiss}
        />
      )}
    </FeedbackContext.Provider>
  )
}
