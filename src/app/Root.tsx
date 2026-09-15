import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../services/query'
import { AuthProvider } from '../auth/AuthProvider'
import { FeedbackProvider } from '../components/Feedback'
import { App, AppBoundary } from './App'
export function Root() {
  return (
    <AppBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FeedbackProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </FeedbackProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppBoundary>
  )
}
