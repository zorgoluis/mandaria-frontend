import { DeveloperPortal } from '../developers/pages'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
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
            <RootRoutes />
          </FeedbackProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppBoundary>
  )
}

/** Public documentation never mounts AuthProvider or restores administrative tokens. */
export function RootRoutes() {
  return (
    <Routes>
      <Route path="/developers/*" element={<DeveloperPortal />} />
      <Route
        path="*"
        element={
          <AuthProvider>
            <App />
          </AuthProvider>
        }
      />
    </Routes>
  )
}
