import { getEspecApiKey } from '../constants/categoriaEspecKey'
import type { CategoriaProduto } from '../types/categoria'
import type { CategoriaProdutoNome } from '../types/categoria'
import type { ProdutoDetail, ProdutoFormData } from '../types/produto'
import {
  apiSpecParaFormState,
  sanitizarEspecificacaoApi,
} from './specFormHelpers'
import { applyCategoriaChange, produtoFormEmpty } from './produtoFormDefaults'

export function produtoDetailToForm(
  p: ProdutoDetail,
  categorias: CategoriaProduto[]
): ProdutoFormData {
  let form: ProdutoFormData = {
    ...produtoFormEmpty(),
    codigo: p.codigo ?? '',
    descricao: p.descricao ?? '',
    categoria: p.categoria ?? '',
    unidade_medida: (p.unidade_medida as ProdutoFormData['unidade_medida']) ?? 'UN',
    valor_unitario: String(p.valor_unitario ?? '0'),
    fabricante: String(p.fabricante ?? ''),
    referencia_fabricante: String(p.referencia_fabricante ?? ''),
    largura_mm: p.largura_mm != null ? String(p.largura_mm) : '',
    altura_mm: p.altura_mm != null ? String(p.altura_mm) : '',
    profundidade_mm: p.profundidade_mm != null ? String(p.profundidade_mm) : '',
    observacoes_tecnicas: String(p.observacoes_tecnicas ?? ''),
    ativo: p.ativo !== false,
    especificacao: null,
  }

  form = applyCategoriaChange(form, form.categoria, categorias)

  const nome = (p.categoria_nome ?? p.categoria) as CategoriaProdutoNome
  const specKey = getEspecApiKey(nome)
  if (!specKey || !form.especificacao) return form

  const bag = (p as Record<string, unknown>)[specKey]
  if (!bag || typeof bag !== 'object') return form

  const limpo = sanitizarEspecificacaoApi(bag as Record<string, unknown>)
  form = {
    ...form,
    especificacao: apiSpecParaFormState(limpo),
  }

  return form
}
