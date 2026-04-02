export type HeaderAtalhoItem = {
  to: string
  label: string
  description?: string
}

export const HEADER_ATALHOS: HeaderAtalhoItem[] = [
  {
    to: '/projetos/novo',
    label: 'Novo projeto',
    description: 'Criar projeto de painel',
  },
  {
    to: '/cargas/novo',
    label: 'Nova carga',
    description: 'Incluir carga no projeto',
  },
  {
    to: '/catalogo/novo',
    label: 'Novo produto',
    description: 'Cadastrar item no catálogo',
  },
  {
    to: '/dimensionamento',
    label: 'Dimensionamento',
    description: 'Correntes e resumo elétrico',
  },
  {
    to: '/composicao',
    label: 'Composição do painel',
    description: 'Sugestões e lista de materiais',
  },
]
