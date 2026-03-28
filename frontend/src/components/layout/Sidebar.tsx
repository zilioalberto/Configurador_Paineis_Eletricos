import { NavLink } from 'react-router-dom'
import { appMenuItems } from '@/app/navigation'

export default function Sidebar() {
  return (
    <aside className="app-sidebar p-3">
      <h2 className="h5 mb-4 app-sidebar-title">Painéis</h2>

      <nav className="nav flex-column gap-2">
        {appMenuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-link rounded px-3 py-2 ${isActive ? 'active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
