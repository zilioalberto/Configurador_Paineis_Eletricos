import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoDetailQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoDetailQuery', () => ({
  useProjetoDetailQuery: () => useProjetoDetailQueryMock(),
}))

import ProjetoDetailPage from '@/modules/projetos/pages/ProjetoDetailPage'

const projeto = {
  id: 'p-1',
  codigo: '04001-26',
  nome: 'Projeto teste',
  descricao: '',
  cliente: '',
  status: 'EM_ANDAMENTO',
  tipo_painel: 'AUTOMACAO',
  tipo_corrente: 'CA',
  tensao_nominal: 380,
  numero_fases: 3,
  frequencia: 60,
  possui_neutro: true,
  possui_terra: true,
  tipo_conexao_alimentacao_potencia: 'BORNE',
  tipo_conexao_alimentacao_neutro: 'BORNE',
  tipo_conexao_alimentacao_terra: 'BORNE',
  tipo_corrente_comando: 'CA',
  tensao_comando: 220,
  possui_plc: false,
  possui_ihm: false,
  possui_switches: false,
  possui_plaqueta_identificacao: false,
  possui_faixa_identificacao: false,
  possui_adesivo_alerta: false,
  possui_adesivos_tensao: false,
  possui_climatizacao: false,
  tipo_climatizacao: null,
  fator_demanda: '1.0',
  possui_seccionamento: false,
  tipo_seccionamento: null,
}

describe('ProjetoDetailPage', () => {
  it('esconde acoes sem permissao', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    useProjetoDetailQueryMock.mockReturnValue({
      data: projeto,
      isPending: false,
      isError: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/projetos/p-1']}>
        <Routes>
          <Route path="/projetos/:id" element={<ProjetoDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: /Editar projeto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Composição/i })).not.toBeInTheDocument()
  })

  it('exibe acoes com permissoes necessarias', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.visualizar', 'projeto.editar', 'almoxarifado.visualizar_tarefas', 'material.visualizar_lista'],
      },
    })
    useProjetoDetailQueryMock.mockReturnValue({
      data: projeto,
      isPending: false,
      isError: false,
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/projetos/p-1']}>
        <Routes>
          <Route path="/projetos/:id" element={<ProjetoDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /Editar projeto/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Composição/i })).toBeInTheDocument()
  })
})
