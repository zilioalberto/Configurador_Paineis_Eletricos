import { getEspecApiKey } from '../constants/categoriaEspecKey'
import type { CategoriaProduto } from '../types/categoria'
import type { CategoriaProdutoNome } from '../types/categoria'
import type { ProdutoFormData } from '../types/produto'

export const produtoFormEmpty = (): ProdutoFormData => ({
  codigo: '',
  descricao: '',
  categoria: '',
  unidade_medida: 'UN',
  valor_unitario: '0',
  fabricante: '',
  referencia_fabricante: '',
  largura_mm: '',
  altura_mm: '',
  profundidade_mm: '',
  observacoes_tecnicas: '',
  ativo: true,
  especificacao: null,
})

export function applyCategoriaChange(
  prev: ProdutoFormData,
  categoriaId: string,
  categorias: CategoriaProduto[]
): ProdutoFormData {
  const cat = categorias.find((c) => c.id === categoriaId || c.nome === categoriaId)
  const nome = cat?.nome as CategoriaProdutoNome | undefined
  const temEspec = nome ? Boolean(getEspecApiKey(nome)) : false
  return {
    ...prev,
    categoria: categoriaId,
    especificacao: temEspec ? {} : null,
  }
}
