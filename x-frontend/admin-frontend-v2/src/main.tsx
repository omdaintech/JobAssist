import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PWAUpdater } from './hooks/usePWA'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <PWAUpdater />
            <App />
        </BrowserRouter>
    </StrictMode>,
) 