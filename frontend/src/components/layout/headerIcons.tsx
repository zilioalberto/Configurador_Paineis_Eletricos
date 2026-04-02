import { Link } from 'react-router-dom'

export function BellIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function UserAvatarPlaceholder({ label }: { label: string }) {
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  return (
    <span className="app-header-user-avatar" aria-hidden>
      {initials}
    </span>
  )
}

export function ListaProjetosLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/projetos" className="app-header-atalhos-footer-link" onClick={onNavigate}>
      Lista de projetos
    </Link>
  )
}
