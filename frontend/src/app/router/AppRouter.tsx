import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import MainLayout from '@/components/layout/MainLayout'
import RequireAuth from '@/modules/auth/RequireAuth'
import { appChildRoutes } from '@/app/navigation'

const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'))

function LoginFallback() {
  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center bg-light"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">A carregar…</span>
      </div>
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoginFallback />}>
              <LoginPage />
            </Suspense>
          }
        />

        <Route element={<RequireAuth />}>
          <Route element={<MainLayout />}>
            {appChildRoutes.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
