import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { listarCategoriasProduto } from '../services/categoriaService'

/** Query da lista fixa de categorias de produto. */
export function useCategoriaListQuery() {
  return useQuery({
    queryKey: catalogoQueryKeys.categorias(),
    queryFn: listarCategoriasProduto,
  })
}
