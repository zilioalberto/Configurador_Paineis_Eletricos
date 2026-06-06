import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import CnaesTable, { montarListaCnaes } from './CnaesTable'

describe('CnaesTable', () => {
  it('exibe mensagem quando não há CNAEs', () => {
    render(<CnaesTable cnaes={[]} vazio="Sem CNAE" />)
    expect(screen.getByText('Sem CNAE')).toBeInTheDocument()
  })

  it('renderiza tabela com principal e secundário', () => {
    render(
      <CnaesTable
        cnaes={[
          { codigo: '1234567', descricao: 'Principal', principal: true },
          { codigo: '7654321', descricao: 'Outro' },
        ]}
      />
    )
    expect(screen.getAllByText('Principal').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Secundário')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
  })
})

describe('montarListaCnaes', () => {
  it('prioriza lista de cnaes do preview', () => {
    expect(
      montarListaCnaes({
        cnaes: [{ codigo: '1', descricao: 'A', principal: true }],
      })
    ).toEqual([{ codigo: '1', descricao: 'A', principal: true }])
  })

  it('monta a partir de cnae_fiscal legado', () => {
    expect(
      montarListaCnaes({
        cnae_fiscal: '6201500',
        cnae_fiscal_descricao: 'Desenvolvimento',
      })
    ).toEqual([
      { codigo: '6201500', descricao: 'Desenvolvimento', principal: true },
    ])
  })

  it('retorna vazio sem dados', () => {
    expect(montarListaCnaes({})).toEqual([])
  })
})
