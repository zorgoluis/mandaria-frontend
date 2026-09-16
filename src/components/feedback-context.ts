import { createContext, useContext } from 'react'
export const FeedbackContext = createContext<
  (message: string, danger?: boolean) => void
>(() => undefined)
export const useFeedback = () => useContext(FeedbackContext)
