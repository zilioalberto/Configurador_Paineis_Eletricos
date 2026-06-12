import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SortableTableHeader from './SortableTableHeader'

describe('SortableTableHeader', () => {
  it('exibe indicador ascendente e dispara onSort', () => {
    const onSort = vi.fn()
    render(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              label="Emissão"
              field="data_emissao"
              ordering="data_emissao"
              onSort={onSort}
            />
          </tr>
        </thead>
      </table>
    )

    const btn = screen.getByRole('button', { name: /emissão/i })
    expect(btn).toHaveTextContent('▲')
    fireEvent.click(btn)
    expect(onSort).toHaveBeenCalledWith('data_emissao')
  })

  it('exibe indicador descendente', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              label="Valor"
              field="valor_total"
              ordering="-valor_total"
              onSort={vi.fn()}
            />
          </tr>
        </thead>
      </table>
    )

    expect(screen.getByRole('button', { name: /valor/i })).toHaveTextContent('▼')
  })

  it('exibe indicador neutro quando coluna não está ordenada', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              label="Série"
              field="serie"
              ordering="-data_emissao"
              onSort={vi.fn()}
            />
          </tr>
        </thead>
      </table>
    )

    expect(screen.getByRole('button', { name: /série/i })).toHaveTextContent('⇅')
  })
})
