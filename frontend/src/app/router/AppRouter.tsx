import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from '../../components/layout/MainLayout'
import DashboardPage from '../../modules/dashboard/pages/DashboardPage'
import ProjetoCreatePage from '../../modules/projetos/pages/ProjetoCreatePage'
import ProjetoDetailPage from '../../modules/projetos/pages/ProjetoDetailPage'
import ProjetoEditPage from '../../modules/projetos/pages/ProjetoEditPage'
import ProjetoListPage from '../../modules/projetos/pages/ProjetoListPage'

type PlaceholderPageProps = {
  title: string
}

function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="container-fluid py-4">
      <h1 className="h3">{title}</h1>
      <p>Página em construção.</p>
    </div>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/projetos" element={<ProjetoListPage />} />
          <Route path="/projetos/novo" element={<ProjetoCreatePage />} />
          <Route path="/projetos/:id" element={<ProjetoDetailPage />} />
          <Route path="/projetos/:id/editar" element={<ProjetoEditPage />} />

          <Route path="/cargas" element={<PlaceholderPage title="Cargas" />} />
          <Route path="/catalogo" element={<PlaceholderPage title="Catálogo" />} />
          <Route path="/dimensionamento" element={<PlaceholderPage title="Dimensionamento" />} />
          <Route path="/composicao" element={<PlaceholderPage title="Composição do Painel" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}