import { Link, useLocation } from 'react-router-dom'
import { getBreadcrumbItems } from '@/app/navigation/breadcrumbs'

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

type HeaderProps = {
  mobileNavOpen?: boolean
  onOpenMobileNav?: () => void
}

export default function Header({
  mobileNavOpen = false,
  onOpenMobileNav,
}: HeaderProps) {
  const { pathname } = useLocation()
  const crumbs = getBreadcrumbItems(pathname)

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <button
          type="button"
          className="btn btn-outline-secondary app-header-menu-btn d-lg-none"
          onClick={onOpenMobileNav}
          aria-label="Abrir menu de navegação"
          aria-controls="app-navigation"
          aria-expanded={mobileNavOpen}
        >
          <MenuIcon />
        </button>

        <div className="app-header-start flex-grow-1 min-w-0">
          <nav aria-label="Trilha de navegação" className="min-w-0">
            <ol className="breadcrumb app-header-breadcrumb mb-0 flex-nowrap text-truncate">
              {crumbs.map((item, index) => {
                const isLast = index === crumbs.length - 1
                return (
                  <li
                    key={`${item.label}-${index}`}
                    className={`breadcrumb-item text-truncate${isLast ? ' active' : ''}`}
                    aria-current={isLast ? 'page' : undefined}
                    title={item.label}
                  >
                    {!isLast && item.to ? (
                      <Link to={item.to} className="text-truncate d-inline-block">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-truncate d-inline-block mw-100">
                        {item.label}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>
      </div>
    </header>
  )
}
