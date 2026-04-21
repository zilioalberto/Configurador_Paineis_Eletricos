import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppFooter from './AppFooter'
import Header from './Header'
import Sidebar from './Sidebar'

function RouteFallback() {
  return (
    <div className="app-page-skeleton" aria-busy="true" aria-live="polite">
      <p className="text-muted small mb-3">Carregando página…</p>
      <div className="placeholder-glow">
        <span className="placeholder col-12 mb-2" style={{ height: '1.25rem' }} />
        <span className="placeholder col-8 mb-4" style={{ height: '1rem' }} />
        <span className="placeholder col-12 mb-2" style={{ height: '8rem' }} />
      </div>
    </div>
  )
}

export default function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sectionHighlighted, setSectionHighlighted] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const id = window.setTimeout(() => setMobileNavOpen(false), 0)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 992px)')
    function onChange() {
      if (mq.matches) {
        setMobileNavOpen(false)
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const hash = location.hash?.trim()
    if (!hash || hash === '#') return

    const id = decodeURIComponent(hash.slice(1))
    const scrollToHashTarget = () => {
      const target = document.getElementById(id)
      if (!target) return

      const topOffset = 96
      const targetTop = target.getBoundingClientRect().top + window.scrollY - topOffset
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      })

      target.classList.remove('app-hash-target-highlight')
      target.classList.add('app-hash-target-highlight')
      setSectionHighlighted(true)
      window.setTimeout(() => {
        target.classList.remove('app-hash-target-highlight')
        setSectionHighlighted(false)
      }, 1800)
    }

    const raf = window.requestAnimationFrame(scrollToHashTarget)
    return () => window.cancelAnimationFrame(raf)
  }, [location.hash, location.pathname])

  return (
    <div className="d-flex app-shell" style={{ minHeight: '100vh' }}>
      <div
        className={`app-sidebar-backdrop ${mobileNavOpen ? 'is-visible' : ''}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden={!mobileNavOpen}
      />

      <Sidebar
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="flex-grow-1 d-flex flex-column min-vw-0 app-layout-main">
        <Header
          mobileNavOpen={mobileNavOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="app-main flex-grow-1">
          {sectionHighlighted ? (
            <div className="app-hash-highlight-pill" role="status" aria-live="polite">
              Navegacao concluida
            </div>
          ) : null}
          <Suspense fallback={<RouteFallback />}>
            <div className="app-page">
              <Outlet />
            </div>
          </Suspense>
        </main>

        <AppFooter />
      </div>
    </div>
  )
}
