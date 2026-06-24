/** Valores iniciais e reset de categoria no formulário de produto. */

import { getEspecApiKey } from '../constants/categoriaEspecKey'
import type { CategoriaProduto, CategoriaProdutoNome } from '../types/categoria'
import type { ProdutoFormData } from '../types/produto'

export const produtoFormEmpty = (): ProdutoFormData => ({
  codigo: '',
  descricao: '',
  categoria: '',
  unidade_medida: 'UN',
  custo_referencia: '0',
  aliquota_ipi: '',
  fabricante_parceiro: '',
  fabricante_parceiro_nome: '',
  fabricante_parceiro_documento: '',
  fornecedor_parceiro: '',
  fornecedor_parceiro_nome: '',
  fornecedor_parceiro_documento: '',
  referencia_fabricante: '',
  largura_mm: '',
  altura_mm: '',
  profundidade_mm: '',
  observacoes_tecnicas: '',
  ativo: true,
  especificacao: null,
  acessorios_compativeis: [],
})

export function applyCategoriaChange(
  prev: ProdutoFormData,
  categoriaId: string,
  categorias: CategoriaProduto[],
): ProdutoFormData {
  const cat = categorias.find((c) => c.id === categoriaId || c.nome === categoriaId)
  const nome = cat?.nome as CategoriaProdutoNome | undefined
  const temEspec = nome ? Boolean(getEspecApiKey(nome)) : false
  return {
    ...prev,
    categoria: categoriaId,
    especificacao: temEspec ? {} : null,
    acessorios_compativeis: nome === 'BORNE' ? prev.acessorios_compativeis : [],
  }
}
