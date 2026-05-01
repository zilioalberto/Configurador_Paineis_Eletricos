import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('contatora sem corrente AC-3/AC-1 mostra aviso e não submete', () => {
    const onSubmit = vi.fn()
    const categorias: CategoriaProduto[] = [
      { id: 'CONTATORA', nome: 'CONTATORA', nome_display: 'Contatora' },
    ]
    const initialData = {
      ...produtoFormEmpty(),
      categoria: 'CONTATORA',
      codigo: 'CT-1',
      descricao: 'Contatora',
      especificacao: {},
    }
    render(<ProdutoForm categorias={categorias} initialData={initialData} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringMatching(/AC-3|AC-1/i),
      }),
    )
  })

  it('seccionadora sem AC-1 e AC-3 mostra aviso e não submete', () => {
    const onSubmit = vi.fn()
    const categorias: CategoriaProduto[] = [
      { id: 'SECCIONADORA', nome: 'SECCIONADORA', nome_display: 'Seccionadora' },
    ]
    const initialData = {
      ...produtoFormEmpty(),
      categoria: 'SECCIONADORA',
      codigo: 'SC-1',
      descricao: 'Seccionadora',
      especificacao: { corrente_ac1_a: '', corrente_ac3_a: '' },
    }
    render(<ProdutoForm categorias={categorias} initialData={initialData} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringMatching(/seccionadora/i),
      }),
    )
  })

  it('disjuntor motor sem faixa min/max mostra aviso e não submete', () => {
    const onSubmit = vi.fn()
    const categorias: CategoriaProduto[] = [
      { id: 'DISJUNTOR_MOTOR', nome: 'DISJUNTOR_MOTOR', nome_display: 'Disjuntor Motor' },
    ]
    const initialData = {
      ...produtoFormEmpty(),
      categoria: 'DISJUNTOR_MOTOR',
      codigo: 'DM-1',
      descricao: 'Disjuntor',
      especificacao: { faixa_ajuste_min_a: '', faixa_ajuste_max_a: '' },
    }
    render(<ProdutoForm categorias={categorias} initialData={initialData} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringMatching(/faixa de ajuste/i),
      }),
    )
  })

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
