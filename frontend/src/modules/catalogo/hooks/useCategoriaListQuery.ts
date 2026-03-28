import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { listarCategoriasProduto } from '../services/categoriaService'

export function useCategoriaListQuery() {
  return useQuery({
    queryKey: catalogoQueryKeys.categorias(),
    queryFn: listarCategoriasProduto,
  })
}
