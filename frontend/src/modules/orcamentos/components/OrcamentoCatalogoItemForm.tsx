import { useState } from 'react'

import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

import OrcamentoCatalogoAutocomplete from './OrcamentoCatalogoAutocomplete'
import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import { criarLinhaDeProdutoCatalogo } from '../utils/orcamentoCatalogoProdutoLinha'

type Props = Readonly<{
  margemProdutos: string
  onAdicionar: (linha: LinhaEditavelOrcamento) => void
  disabled?: boolean
  variant?: 'default' | 'inline'
}>

export default function OrcamentoCatalogoItemForm({
  margemProdutos,
  onAdicionar,
  disabled = false,
  variant = 'default',
}: Props) {
  const [termo, setTermo] = useState('')

  function escolher(produto: ProdutoListItem) {
    onAdicionar(criarLinhaDeProdutoCatalogo(produto, margemProdutos))
    setTermo('')
  }

  if (variant === 'inline') {
    return (
      <div className="orcamento-doc__toolbar-search">
        <OrcamentoCatalogoAutocomplete
          value={termo}
          onValueChange={setTermo}
          onSelectProduto={escolher}
          disabled={disabled}
          placeholder="Código ou descrição do produto…"
        />
      </div>
    )
  }

  return (
    <div className="border border-primary border-opacity-25 rounded p-2 mb-2 bg-light">
      <span className="form-label small fw-semibold d-block mb-1">
        Adicionar do catálogo
      </span>
      <OrcamentoCatalogoAutocomplete
        value={termo}
        onValueChange={setTermo}
        onSelectProduto={escolher}
        disabled={disabled}
        placeholder="Buscar por código ou descrição (mín. 2 caracteres)…"
      />
    </div>
  )
}
