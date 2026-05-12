import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/catalogo': 'Catálogo',
  '/dimensionamento': 'Dimensionamento de condutores',
<<<<<<< HEAD
  '/composicao': 'Composição do Painel',
=======
  '/composicao': 'Composição do painel',
>>>>>>> origin/main
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
