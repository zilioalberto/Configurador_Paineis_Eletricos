import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { appMenuItems } from '@/app/navigation'
import { isAppMenuGroup, type AppMenuItem } from '@/app/navigation/types'
import { APP_PRODUCT_FULL_NAME } from '@/constants/appBranding'
import { ZFW_LOGO_PNG_URL } from '@/constants/brandingAssets'
import { ZFW_SITE_URL } from '@/constants/zfwSite'
import { useAuth } from '@/modules/auth/AuthContext'
import { isAppAdmin } from '@/modules/auth/appAdmin'
import { hasPermission } from '@/modules/auth/permissions'
import { SidebarMenuGroup } from './SidebarMenuGroup'
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
  const { user } = useAuth()
  const menuItems = useMemo(() => {
    const out: AppMenuItem[] = []
    for (const item of appMenuItems) {
      if (isAppMenuGroup(item)) {
        if (item.requiresAppAdmin && !isAppAdmin(user)) continue
        if (
          item.requiresPermission &&
          !hasPermission(user, item.requiresPermission)
        )
          continue
        const children = item.children.filter((c) => {
          if (c.requiresAppAdmin && !isAppAdmin(user)) return false
          if (c.requiresPermission && !hasPermission(user, c.requiresPermission))
            return false
          return true
        })
        if (children.length === 0) continue
        out.push({ ...item, children })
      } else {
        if (item.requiresAppAdmin && !isAppAdmin(user)) continue
        if (
          item.requiresPermission &&
          !hasPermission(user, item.requiresPermission)
        )
          continue
        out.push(item)
      }
    }
    return out
  }, [user])

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
            src={ZFW_LOGO_PNG_URL}
            alt="ZFW Engenharia"
            width={220}
            height={72}
            decoding="async"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </a>
        <p className="app-sidebar-brand-tagline mb-0">{APP_PRODUCT_FULL_NAME}</p>
      </div>

      <div className="app-sidebar-divider" role="presentation" />

      <nav
        className="app-sidebar-nav nav flex-column flex-grow-1"
        aria-label="Módulos principais"
      >
        {menuItems.map((item) =>
          isAppMenuGroup(item) ? (
            <SidebarMenuGroup key={item.id} id={item.id} label={item.label} onNavigate={onNavigate}>
              {item.children}
            </SidebarMenuGroup>
          ) : (
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
          )
        )}
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
