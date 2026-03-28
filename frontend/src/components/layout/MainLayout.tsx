import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'


export default function MainLayout() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />

      <div className="flex-grow-1 d-flex flex-column">
        <Header />

        <main className="flex-grow-1 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  )
}