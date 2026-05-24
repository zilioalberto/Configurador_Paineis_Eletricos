import { useState } from 'react'

import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

import OrcamentoCatalogoAutocomplete from './OrcamentoCatalogoAutocomplete'
import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import { criarLinhaDeProdutoCatalogo } from '../utils/orcamentoCatalogoProdutoLinha'

type Props = Readonly<{
  margemProdutos: string
  onAdicionar: (linha: LinhaEditavelOrcamento) => void
  disabled?: boolean
}>

export default function OrcamentoCatalogoItemForm({
  margemProdutos,
  onAdicionar,
  disabled = false,
}: Props) {
  const [termo, setTermo] = useState('')

  function escolher(produto: ProdutoListItem) {
    onAdicionar(criarLinhaDeProdutoCatalogo(produto, margemProdutos))
    setTermo('')
  }

  return (
    <div className="border rounded p-3 mb-3 bg-light">
      <p className="small text-muted mb-2 mb-md-2">
        Adicionar produto do catálogo (busca por código ou descrição, mín. 2 caracteres). Use ↑ ↓
        e Enter para selecionar.
      </p>
      <OrcamentoCatalogoAutocomplete
        value={termo}
        onValueChange={setTermo}
        onSelectProduto={escolher}
        disabled={disabled}
        placeholder="Buscar no catálogo…"
      />
    </div>
  )
}
