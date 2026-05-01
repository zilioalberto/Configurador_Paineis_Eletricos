import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CategoriaProduto } from '@/modules/catalogo/types/categoria'
import { produtoFormEmpty } from '@/modules/catalogo/utils/produtoFormDefaults'

const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/catalogo/components/EspecificacaoCatalogoFields', () => ({
  default: () => null,
}))

import ProdutoForm from '@/modules/catalogo/components/ProdutoForm'

describe('ProdutoForm', () => {
  it('submete quando categoria sem bloco de especificação', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const categorias: CategoriaProduto[] = [
      {
        id: 'SEM_REGRA_SUGESTAO_AUTOMATICA',
        nome: 'SEM_REGRA_SUGESTAO_AUTOMATICA',
        nome_display: 'Sem regra',
      },
    ]
    const initialData = {
      ...produtoFormEmpty(),
      categoria: 'SEM_REGRA_SUGESTAO_AUTOMATICA',
      codigo: 'COD-1',
      descricao: 'Descrição teste',
    }
    render(
      <ProdutoForm
        categorias={categorias}
        initialData={initialData}
        onSubmit={onSubmit}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.codigo).toBe('COD-1')
    expect(payload.categoria).toBe('SEM_REGRA_SUGESTAO_AUTOMATICA')
  })

  it('não submete sem categoria selecionada', () => {
    const onSubmit = vi.fn()
    const categorias: CategoriaProduto[] = [
      { id: 'BORNE', nome: 'BORNE', nome_display: 'Borne' },
    ]
    const initialData = produtoFormEmpty()
    render(
      <ProdutoForm categorias={categorias} initialData={initialData} onSubmit={onSubmit} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
