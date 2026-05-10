import { getEspecApiKey } from '../constants/categoriaEspecKey'
import { unidadeMedidaProdutoOptions } from '../constants/catalogoChoiceOptions'
import type { CategoriaProduto } from '../types/categoria'
import type { CategoriaProdutoNome } from '../types/categoria'
import type { ProdutoDetail, ProdutoFormData } from '../types/produto'
import {
  apiSpecParaFormState,
  sanitizarEspecificacaoApi,
} from './specFormHelpers'
import { applyCategoriaChange, produtoFormEmpty } from './produtoFormDefaults'

const _CODIGOS_UNIDADE_CATALOGO = new Set(
  unidadeMedidaProdutoOptions.map((o) => o.value),
)

function _unidadeMedidaApiParaForm(raw: unknown): ProdutoFormData['unidade_medida'] {
  const u = String(raw ?? 'UN')
    .trim()
    .toUpperCase()
  if (_CODIGOS_UNIDADE_CATALOGO.has(u as ProdutoFormData['unidade_medida'])) {
    return u as ProdutoFormData['unidade_medida']
  }
  return 'UN'
}

function strDecApi(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v)
}

export function produtoDetailToForm(
  p: ProdutoDetail,
  categorias: CategoriaProduto[],
): ProdutoFormData {
  let form: ProdutoFormData = {
    ...produtoFormEmpty(),
    codigo: p.codigo ?? '',
    descricao: p.descricao ?? '',
    categoria: p.categoria ?? '',
    unidade_medida: _unidadeMedidaApiParaForm(p.unidade_medida),
    preco_base: String(p.preco_base ?? '0'),
    aliquota_ipi: strDecApi(p.aliquota_ipi),
    fabricante_parceiro: p.fabricante_parceiro ?? '',
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
