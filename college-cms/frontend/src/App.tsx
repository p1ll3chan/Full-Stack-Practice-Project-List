import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import PublicPageTransition from './components/PublicPageTransition'
import Header from './components/Header'
import Footer from './components/Footer'
import { AuthProvider } from './admin/auth'
import ContentSync from './admin/ContentSync'
import { createQueryClient } from './api/queryClient'
import { AppRoutes } from './routes'

const queryClient = createQueryClient()

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ContentSync />
        <PublicPageTransition />
        <AuthProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          <main id="main" className="container">
            <AppRoutes />
          </main>
          <div className="divider-slant" aria-hidden="true" />
          <Footer />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}
