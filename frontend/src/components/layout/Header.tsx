import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  APP_HEADER_BRAND,
  APP_HEADER_TAGLINE,
  getHeaderUserDisplayName,
} from '@/constants/appBranding'
import { useAuth } from '@/modules/auth/AuthContext'
import { authDisplayName } from '@/modules/auth/types'
import { BellIcon, UserAvatarPlaceholder } from './headerIcons'

function MenuIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`app-header-chevron${open ? ' is-open' : ''}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type HeaderProps = {
  mobileNavOpen?: boolean
  onOpenMobileNav?: () => void
}

export default function Header({
  mobileNavOpen = false,
  onOpenMobileNav,
}: HeaderProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const userName = user ? authDisplayName(user) : getHeaderUserDisplayName()
  const firstName = userName.split(/\s+/)[0] ?? userName

  const userMenuId = useId()
  const notifId = useId()

  const [userOpen, setUserOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const userRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const closeAll = useCallback(() => {
    setUserOpen(false)
    setNotifOpen(false)
  }, [])

  const handleLogout = useCallback(() => {
    closeAll()
    logout()
    void navigate('/login', { replace: true })
  }, [closeAll, logout, navigate])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target
      if (!(t instanceof Node)) return
      if (userRef.current?.contains(t)) return
      if (notifRef.current?.contains(t)) return
      closeAll()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [closeAll])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAll()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeAll])

  const openUser = () => {
    setNotifOpen(false)
    setUserOpen((v) => !v)
  }
  const openNotif = () => {
    setUserOpen(false)
    setNotifOpen((v) => !v)
  }

  const closeOnNavigate = () => closeAll()

  return (
    <header className="app-header">
      <div className="app-header-bar">
        <div className="app-header-bar-inner">
          <button
            type="button"
            className="app-header-menu-btn-onbar d-lg-none"
            onClick={onOpenMobileNav}
            aria-label="Abrir menu de navegação"
            aria-controls="app-navigation"
            aria-expanded={mobileNavOpen}
          >
            <MenuIcon />
          </button>

          <Link
            to="/"
            className="app-header-brand text-decoration-none text-white"
            onClick={closeOnNavigate}
          >
            <span className="app-header-brand-text">
              <span className="app-header-brand-title">{APP_HEADER_BRAND}</span>
              <span className="app-header-brand-tagline d-none d-sm-inline">
                {APP_HEADER_TAGLINE}
              </span>
            </span>
          </Link>

          <div className="app-header-bar-center flex-grow-1 min-w-0 d-flex align-items-center" />

          <div className="app-header-bar-end">
            <div className="position-relative" ref={userRef}>
              <button
                type="button"
                className="app-header-user-trigger btn btn-link text-white text-decoration-none p-0 d-flex align-items-center gap-2"
                aria-expanded={userOpen}
                aria-haspopup="true"
                aria-controls={userMenuId}
                onClick={openUser}
              >
                <UserAvatarPlaceholder label={userName} />
                <span className="app-header-user-greeting d-none d-sm-inline">
                  Olá, <span className="app-header-user-name">{firstName}</span>
                </span>
                <ChevronDown open={userOpen} />
              </button>
              {userOpen ? (
                <div
                  className="app-header-dropdown app-header-user-panel shadow-sm"
                  id={userMenuId}
                  role="menu"
                >
                  <div className="px-3 py-2 border-bottom small text-muted">
                    {user ? (
                      <>
                        <div className="text-truncate" title={user.email}>
                          {user.email}
                        </div>
                        <div className="mt-1">{user.tipo_usuario}</div>
                      </>
                    ) : (
                      'Sessão ativa.'
                    )}
                  </div>
                  <button type="button" className="app-header-menu-item" disabled>
                    Perfil
                  </button>
                  <button type="button" className="app-header-menu-item" disabled>
                    Preferências
                  </button>
                  <button type="button" className="app-header-menu-item" onClick={handleLogout}>
                    Sair
                  </button>
                </div>
              ) : null}
            </div>

            <div className="app-header-vdivider d-none d-sm-block" aria-hidden />

            <div className="position-relative" ref={notifRef}>
              <button
                type="button"
                className="btn btn-link text-white p-2 rounded-2 app-header-icon-btn"
                aria-label="Alertas do sistema"
                aria-expanded={notifOpen}
                aria-haspopup="true"
                aria-controls={notifId}
                onClick={openNotif}
              >
                <BellIcon />
              </button>
              {notifOpen ? (
                <div
                  className="app-header-dropdown app-header-notif-panel shadow-sm"
                  id={notifId}
                  role="dialog"
                  aria-label="Notificações"
                >
                  <p className="small text-muted mb-0 px-1">
                    Sem alertas no momento. Avisos de pendências e exportações poderão aparecer
                    aqui no futuro.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
