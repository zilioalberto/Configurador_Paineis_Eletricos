import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

import OrcamentoCatalogoAutocomplete from './OrcamentoCatalogoAutocomplete'
import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import { patchLinhaDeProdutoCatalogo } from '../utils/orcamentoCatalogoProdutoLinha'

type Props = Readonly<{
  index: number
  linha: LinhaEditavelOrcamento
  margemProdutos: string
  salvandoItens: boolean
  atualizarLinha: (index: number, patch: Partial<LinhaEditavelOrcamento>) => void
}>

export default function OrcamentoLinhaDescricaoCampo({
  index,
  linha,
  margemProdutos,
  salvandoItens,
  atualizarLinha,
}: Props) {
  function escolher(produto: ProdutoListItem) {
    atualizarLinha(index, patchLinhaDeProdutoCatalogo(produto, linha, margemProdutos))
  }

  return (
    <td className="position-relative">
      <OrcamentoCatalogoAutocomplete
        value={linha.descricao}
        onValueChange={(descricao) => atualizarLinha(index, { descricao })}
        onSelectProduto={escolher}
        disabled={salvandoItens}
        placeholder="Descrição ou busca no catálogo…"
        dropdownZIndex={1050}
      />
    </td>
  )
}
