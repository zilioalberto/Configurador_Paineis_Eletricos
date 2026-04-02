import { NavLink } from 'react-router-dom'
import { appMenuItems } from '@/app/navigation'
import { ZFW_SITE_URL } from '@/constants/zfwSite'
import { SidebarNavIcon } from './sidebarNavIcons'

const APP_VERSION = '1.0.0'

function envShort(mode: string): string {
  if (mode === 'production') return 'prod'
  if (mode === 'development') return 'dev'
  return mode
}

type SidebarProps = {
  mobileOpen?: boolean
  onNavigate?: () => void
}

export default function Sidebar({
  mobileOpen = false,
  onNavigate,
}: SidebarProps) {
  const mode = import.meta.env.MODE

  return (
    <aside
      className={`app-sidebar d-flex flex-column${mobileOpen ? ' app-sidebar--open' : ''}`}
      id="app-navigation"
      aria-label="Navegação principal"
    >
      <div className="app-sidebar-brand">
        <a
          className="app-sidebar-brand-logo"
          href={ZFW_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="ZFW Engenharia — abrir site em nova aba"
        >
          <img
            src="/branding/zfw-logo.png"
            alt=""
            width={200}
            height={56}
            decoding="async"
          />
        </a>
        <p className="app-sidebar-brand-tagline mb-0">
          Configurador de Painéis Elétricos
        </p>
      </div>

      <div className="app-sidebar-divider" role="presentation" />

      <nav
        className="app-sidebar-nav nav flex-column flex-grow-1"
        aria-label="Módulos principais"
      >
        {appMenuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `app-sidebar-link nav-link d-flex align-items-center gap-2 ${isActive ? 'active' : ''}`
            }
            title={item.label}
            onClick={() => onNavigate?.()}
          >
            <SidebarNavIcon to={item.to} />
            <span className="app-sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar-footer">
        <a
          className="app-sidebar-site-link"
          href={ZFW_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          zfw.com.br
        </a>
        <div className="app-sidebar-footer-line">
          <span className="text-muted">Versão {APP_VERSION}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{envShort(mode)}</span>
        </div>
      </div>
    </aside>
  )
}
