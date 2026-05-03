import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import CargaTable from '@/modules/cargas/components/CargaTable'
import type { CargaListItem } from '@/modules/cargas/types/carga'

function makeCarga(): CargaListItem {
  return {
    id: 'c-1',
    projeto: 'p-1',
    projeto_codigo: '04001-26',
    projeto_nome: 'Projeto teste',
    tag: 'M1',
    descricao: 'Motor principal',
    tipo: 'MOTOR',
    tipo_display: 'Motor',
    projeto_tensao_display: '380 V',
    projeto_fases_display: 'Trifásico',
    projeto_tipo_corrente_display: 'CA',
    fases_carga_display: 'Monofásico',
    corrente_calculada_a: '10.0',
    potencia_corrente_valor: '5.0',
    potencia_corrente_unidade: 'CV',
    quantidade: 1,
    ativo: true,
  }
}

describe('CargaTable', () => {
  it('oculta botoes de editar/excluir sem permissao', () => {
    render(
      <MemoryRouter>
        <CargaTable
          cargas={[makeCarga()]}
          projetoId="p-1"
          onDeleteRequest={vi.fn()}
          canManage={false}
        />
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('mostra botoes de editar/excluir com permissao', () => {
    const onDeleteRequest = vi.fn()
    render(
      <MemoryRouter>
        <CargaTable
          cargas={[makeCarga()]}
          projetoId="p-1"
          onDeleteRequest={onDeleteRequest}
          canManage={true}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onDeleteRequest).toHaveBeenCalledWith('c-1')
  })
})
