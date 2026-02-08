import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AdminProvider } from './contexts/AdminContext'
import { ToastProvider } from './contexts/ToastContext'
import { ToastViewport } from './components/Toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AdminProvider>
        <App />
        <ToastViewport />
      </AdminProvider>
    </ToastProvider>
  </React.StrictMode>,
)

