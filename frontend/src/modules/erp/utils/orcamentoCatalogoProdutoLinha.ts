import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import { calcularPrecoUnitarioLinha } from './orcamentoPrecoLinha'

function aliquotaIpiProduto(produto: ProdutoListItem): string | null {
  if (produto.aliquota_ipi != null && produto.aliquota_ipi !== '') {
    return String(produto.aliquota_ipi)
  }
  return null
}

export function criarLinhaDeProdutoCatalogo(
  produto: ProdutoListItem,
  margemProdutos: string,
  extras?: Partial<LinhaEditavelOrcamento>
): LinhaEditavelOrcamento {
  const custo = String(produto.preco_base ?? '0')
  const margem = margemProdutos || '0'
  const aliquota_ipi = aliquotaIpiProduto(produto)
  return {
    ordem: 0,
    tipo: 'PRODUTO',
    origem: 'CATALOGO',
    editavel: true,
    produtoId: produto.id,
    produtoCodigo: produto.codigo,
    descricao: produto.descricao,
    quantidade: '1',
    custo_unitario: custo,
    margem_percentual: margem,
    margem_minima: margem,
    aliquota_ipi,
    preco_unitario: calcularPrecoUnitarioLinha(custo, margem, aliquota_ipi),
    ...extras,
  }
}

export function patchLinhaDeProdutoCatalogo(
  produto: ProdutoListItem,
  linhaAtual: LinhaEditavelOrcamento,
  margemProdutos: string
): Partial<LinhaEditavelOrcamento> {
  const criada = criarLinhaDeProdutoCatalogo(produto, margemProdutos)
  return {
    ...criada,
    id: linhaAtual.id,
    ordem: linhaAtual.ordem,
    quantidade: linhaAtual.quantidade || criada.quantidade,
  }
}
