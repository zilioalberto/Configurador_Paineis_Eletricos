import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import type { AppMenuLinkItem } from '@/app/navigation/types'
import { SidebarNavIcon } from './sidebarNavIcons'

export function pathMatchesMenuLink(
  pathname: string,
  item: AppMenuLinkItem
): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

type SidebarMenuGroupProps = {
  id: string
  label: string
  children: AppMenuLinkItem[]
  onNavigate?: () => void
}

export function SidebarMenuGroup({
  id,
  label,
  children,
  onNavigate,
}: SidebarMenuGroupProps) {
  const location = useLocation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [fixedStyle, setFixedStyle] = useState({ top: 0, left: 0 })
  const [supportsHover, setSupportsHover] = useState(false)

  const hasActiveChild = children.some((c) =>
    pathMatchesMenuLink(location.pathname, c)
  )

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)')
    const sync = () => setSupportsHover(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setFixedStyle({ top: r.top, left: r.right + 8 })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  const closeTimerRef = useRef<number | null>(null)

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelScheduledClose()
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, 180)
  }, [cancelScheduledClose])

  const openMenu = useCallback(() => {
    cancelScheduledClose()
    updatePosition()
    setOpen(true)
  }, [cancelScheduledClose, updatePosition])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    let dismiss: ((e: MouseEvent | TouchEvent) => void) | undefined
    const timer = window.setTimeout(() => {
      dismiss = (e: MouseEvent | TouchEvent) => {
        const el = e.target as Node
        if (triggerRef.current?.contains(el)) return
        if (submenuRef.current?.contains(el)) return
        setOpen(false)
      }
      document.addEventListener('mousedown', dismiss)
      document.addEventListener('touchstart', dismiss)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      if (dismiss) {
        document.removeEventListener('mousedown', dismiss)
        document.removeEventListener('touchstart', dismiss)
      }
    }
  }, [open])

  const submenu =
    open &&
    createPortal(
      <div
        ref={submenuRef}
        id={`sidebar-submenu-${id}`}
        role="menu"
        className="app-sidebar-submenu"
        style={{
          position: 'fixed',
          top: fixedStyle.top,
          left: fixedStyle.left,
          zIndex: 1080,
        }}
        onMouseEnter={supportsHover ? openMenu : undefined}
        onMouseLeave={supportsHover ? scheduleClose : undefined}
      >
        <div className="app-sidebar-submenu-title">{label}</div>
        <div className="app-sidebar-submenu-links">
          {children.map((child) => (
            <NavLink
              key={child.to}
              role="menuitem"
              to={child.to}
              end={child.end}
              className={({ isActive }) =>
                `app-sidebar-submenu-link ${isActive ? 'active' : ''}`
              }
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
            >
              <SidebarNavIcon to={child.to} />
              <span className="app-sidebar-submenu-link-label">{child.label}</span>
            </NavLink>
          ))}
        </div>
      </div>,
      document.body
    )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`app-sidebar-link app-sidebar-menu-group-trigger nav-link d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent ${
          hasActiveChild ? 'active' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`sidebar-submenu-${id}`}
        title={label}
        onMouseEnter={supportsHover ? openMenu : undefined}
        onMouseLeave={supportsHover ? scheduleClose : undefined}
        onClick={() => {
          if (!supportsHover) {
            updatePosition()
            setOpen((o) => !o)
          }
        }}
      >
        <SidebarNavIcon menuGroupId={id} />
        <span className="app-sidebar-link-label flex-grow-1">{label}</span>
        <span className="app-sidebar-menu-group-chevron" aria-hidden>
          ›
        </span>
      </button>
      {submenu}
    </>
  )
}
