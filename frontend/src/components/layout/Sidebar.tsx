import { NavLink } from 'react-router-dom'

type MenuItem = {
  to: string
  label: string
  end?: boolean
}

const menuItems: MenuItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projetos', label: 'Projetos' },
  { to: '/cargas', label: 'Cargas' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/dimensionamento', label: 'Dimensionamento' },
  { to: '/composicao', label: 'Composição' },
]

export default function Sidebar() {
  return (
    <aside
      className="bg-dark text-white p-3"
      style={{ width: '260px', minHeight: '100vh' }}
    >
      <h2 className="h5 mb-4">Painéis</h2>

      <nav className="nav flex-column gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-link rounded px-3 py-2 ${
                isActive ? 'bg-primary text-white' : 'text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}