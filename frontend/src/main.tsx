import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { ToastProvider } from '@/components/feedback'
import App from '@/App'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '@/assets/styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryProvider>
  </React.StrictMode>,
)
