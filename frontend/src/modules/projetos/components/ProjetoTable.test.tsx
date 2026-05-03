import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import ProjetoTable from '@/modules/projetos/components/ProjetoTable'
import type { Projeto } from '@/modules/projetos/types/projeto'

function makeProjeto(): Projeto {
  return {
    id: 'p-1',
    codigo: '04001-26',
    nome: 'Projeto teste',
    descricao: '',
    cliente: 'Cliente',
    responsavel_nome: 'Fulano Responsável',
    status: 'EM_ANDAMENTO',
    status_display: 'Em andamento',
    tipo_painel: 'AUTOMACAO',
    tipo_painel_display: 'Automação',
    tipo_corrente: 'CA',
    tensao_nominal: 380,
    numero_fases: 3,
    frequencia: 60,
    possui_neutro: true,
    possui_terra: true,
    tipo_conexao_alimentacao_potencia: 'BORNE',
    tipo_conexao_alimentacao_potencia_display: 'Borne',
    tipo_conexao_alimentacao_neutro: 'BORNE',
    tipo_conexao_alimentacao_neutro_display: 'Borne',
    tipo_conexao_alimentacao_terra: 'BORNE',
    tipo_conexao_alimentacao_terra_display: 'Borne',
    tipo_corrente_comando: 'CA',
    tensao_comando: 220,
    possui_plc: false,
    familia_plc: null,
    possui_ihm: false,
    possui_switches: false,
    possui_plaqueta_identificacao: false,
    possui_faixa_identificacao: false,
    possui_adesivo_alerta: false,
    possui_adesivos_tensao: false,
    possui_climatizacao: false,
    tipo_climatizacao: null,
    fator_demanda: '1.00',
    degraus_margem_bitola_condutores: 0,
    possui_seccionamento: false,
    tipo_seccionamento: null,
  }
}

describe('ProjetoTable', () => {
  it('oculta botoes de editar/excluir sem permissao', () => {
    render(
      <MemoryRouter>
        <ProjetoTable
          projetos={[makeProjeto()]}
          onDeleteRequest={vi.fn()}
          canEdit={false}
          canDelete={false}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Visualizar' })).toBeInTheDocument()
    expect(screen.getByText('Fulano Responsável')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('mostra botoes e dispara exclusao quando permitido', () => {
    const onDeleteRequest = vi.fn()
    render(
      <MemoryRouter>
        <ProjetoTable
          projetos={[makeProjeto()]}
          onDeleteRequest={onDeleteRequest}
          canEdit={true}
          canDelete={true}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onDeleteRequest).toHaveBeenCalledWith('p-1')
  })
})
