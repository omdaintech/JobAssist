import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { FirebaseAuthProvider } from './context/FirebaseAuthContext.tsx'
import { FlagsmithProvider } from './contexts/FlagsmithContext.tsx'
import { brandManager } from './utils/brand-manager.ts'
import './index.css'

// Initialize default brand theme
brandManager.loadDefaultTheme().catch(console.error)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FlagsmithProvider>
      <AuthProvider>
        <FirebaseAuthProvider>
          <App />
        </FirebaseAuthProvider>
      </AuthProvider>
    </FlagsmithProvider>
  </StrictMode>,
)
