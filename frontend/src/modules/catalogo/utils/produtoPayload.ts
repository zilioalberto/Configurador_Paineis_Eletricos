import { getEspecApiKey } from '../constants/categoriaEspecKey'
import type { CategoriaProduto } from '../types/categoria'
import type { CategoriaProdutoNome } from '../types/categoria'
import type { ProdutoFormData } from '../types/produto'
import { especFormParaPayload } from './specFormHelpers'

function dec(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

function num(s: string): string | number {
  const t = s.trim()
  if (t === '') return 0
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function produtoFormToApiPayload(
  data: ProdutoFormData,
  categorias: CategoriaProduto[]
): Record<string, unknown> {
  const cat = categorias.find((c) => c.id === data.categoria || c.nome === data.categoria)
  const nome = (cat?.nome ?? data.categoria) as CategoriaProdutoNome

  const base: Record<string, unknown> = {
    codigo: data.codigo.trim(),
    descricao: data.descricao.trim(),
    categoria: data.categoria,
    unidade_medida: data.unidade_medida,
    valor_unitario: num(data.valor_unitario),
    fabricante: data.fabricante.trim(),
    referencia_fabricante: data.referencia_fabricante.trim(),
    largura_mm: dec(data.largura_mm),
    altura_mm: dec(data.altura_mm),
    profundidade_mm: dec(data.profundidade_mm),
    observacoes_tecnicas: data.observacoes_tecnicas.trim(),
    ativo: data.ativo,
  }

  const specKey = getEspecApiKey(nome)
  if (specKey) {
    base[specKey] = data.especificacao
      ? especFormParaPayload(data.especificacao, nome)
      : {}
  }

  return base
}
