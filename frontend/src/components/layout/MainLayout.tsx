import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

function RouteFallback() {
  return (
    <div className="container-fluid py-4">
      <p className="text-muted mb-0">Carregando página...</p>
    </div>
  )
}

export default function MainLayout() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      <div className="flex-grow-1 d-flex flex-column min-vw-0">
        <Header />

        <main className="app-main flex-grow-1">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
