import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import ErrorBoundary from './components/errorBoundary.jsx'
import ScrollToTop from './components/scrollToTop.jsx'
import { AuthProvider } from './context/auth.jsx'
import { CartProvider } from './context/cart.jsx'
import '../css/styles.css'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
