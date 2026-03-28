import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/cargas': 'Cargas',
  '/catalogo': 'Catálogo',
  '/dimensionamento': 'Dimensionamento',
  '/composicao': 'Composição do Painel',
}

export default function PlaceholderOutlet() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Página'

  return (
    <div className="container-fluid">
      <h1 className="h3">{title}</h1>
      <p>Página em construção.</p>
    </div>
  )
}
