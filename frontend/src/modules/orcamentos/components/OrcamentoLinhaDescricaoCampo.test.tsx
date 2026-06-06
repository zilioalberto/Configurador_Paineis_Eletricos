import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'

const useOrcamentoCatalogoBuscaMock = vi.fn()

vi.mock('../hooks/useOrcamentoCatalogoBusca', () => ({
  useOrcamentoCatalogoBusca: (termo: string) => useOrcamentoCatalogoBuscaMock(termo),
}))

import OrcamentoLinhaDescricaoCampo from './OrcamentoLinhaDescricaoCampo'

const produtos: ProdutoListItem[] = [
  {
    id: 'p1',
    codigo: '3TS29100BB4',
    descricao: 'CONTATOR A',
    categoria: 'CONTATOR',
    fabricante: 'Siemens',
    unidade_medida: 'UN',
    preco_base: '10',
    aliquota_ipi: '5',
    ativo: true,
  },
]

const linhaBase: LinhaEditavelOrcamento = {
  ordem: 0,
  tipo: 'PRODUTO',
  origem: 'MANUAL',
  editavel: true,
  descricao: '',
  quantidade: '1',
  custo_unitario: '0',
  margem_percentual: '10',
  margem_minima: '10',
  preco_unitario: '0',
}

function setupBuscaHook(itens: ProdutoListItem[] = produtos) {
  let aberto = true
  useOrcamentoCatalogoBuscaMock.mockImplementation(() => ({
    itens,
    carregando: false,
    aberto,
    setAberto: (v: boolean) => {
      aberto = v
    },
    limparResultados: vi.fn(),
    minChars: 2,
  }))
}

describe('OrcamentoLinhaDescricaoCampo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupBuscaHook()
  })

  it('atualiza descrição ao digitar', () => {
    const atualizarLinha = vi.fn()
    render(
      <table>
        <tbody>
          <tr>
            <OrcamentoLinhaDescricaoCampo
              index={0}
              linha={linhaBase}
              margemProdutos="10"
              salvandoItens={false}
              atualizarLinha={atualizarLinha}
            />
          </tr>
        </tbody>
      </table>
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cont' } })
    expect(atualizarLinha).toHaveBeenCalledWith(0, { descricao: 'cont' })
  })

  it('preenche linha ao selecionar produto com Enter', () => {
    const atualizarLinha = vi.fn()

    function LinhaComEstado() {
      const [linha, setLinha] = useState(linhaBase)
      return (
        <table>
          <tbody>
            <tr>
              <OrcamentoLinhaDescricaoCampo
                index={0}
                linha={linha}
                margemProdutos="10"
                salvandoItens={false}
                atualizarLinha={(index, patch) => {
                  atualizarLinha(index, patch)
                  setLinha((atual) => ({ ...atual, ...patch }))
                }}
              />
            </tr>
          </tbody>
        </table>
      )
    }

    render(<LinhaComEstado />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'cont' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(atualizarLinha).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        produtoId: 'p1',
        descricao: 'CONTATOR A',
        origem: 'CATALOGO',
      })
    )
  })
})
