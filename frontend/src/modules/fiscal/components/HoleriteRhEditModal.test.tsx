import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listarColaboradoresMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/rh/services/rhApi', () => ({
  rhApi: {
    listarColaboradores: (...args: unknown[]) => listarColaboradoresMock(...args),
  },
}))

import { HoleriteRhEditModal } from './HoleriteRhEditModal'
import type {
  AtualizarHoleritePayload,
  HoleriteCompetenciaDto,
} from '../services/fiscalObrigacoesService'

function holerite(overrides: Partial<HoleriteCompetenciaDto> = {}): HoleriteCompetenciaDto {
  return {
    id: 1,
    cpf: '12345678901',
    nome: 'João da Silva',
    tipo: 'HOLERITE',
    tipo_label: 'Holerite',
    proventos: '1500.00',
    desconto_inss: '150.00',
    base_fgts: '1500.00',
    fgts_mes: '120.00',
    total_liquido: '1350.00',
    colaborador_id: null,
    colaborador_nome: '',
    colaborador_matricula: '',
    vinculo_rh: 'PENDENTE',
    valores_aplicados: true,
    aviso_rh: '',
    colaborador_sugerido_id: null,
    colaborador_sugerido_nome: '',
    valores_pendentes: {},
    ...overrides,
  } as HoleriteCompetenciaDto
}

type Opts = {
  holerite?: HoleriteCompetenciaDto
  isSubmitting?: boolean
  isCreatingColaborador?: boolean
  onClose?: () => void
  onSave?: (p: AtualizarHoleritePayload) => Promise<void>
  onCriarColaborador?: () => Promise<void>
}

function renderModal(opts: Opts = {}) {
  const onClose = opts.onClose ?? vi.fn()
  const onSave = opts.onSave ?? vi.fn().mockResolvedValue(undefined)
  const onCriarColaborador = opts.onCriarColaborador ?? vi.fn().mockResolvedValue(undefined)
  render(
    <MemoryRouter>
      <HoleriteRhEditModal
        holerite={opts.holerite ?? holerite()}
        isSubmitting={opts.isSubmitting ?? false}
        isCreatingColaborador={opts.isCreatingColaborador ?? false}
        onClose={onClose}
        onSave={onSave}
        onCriarColaborador={onCriarColaborador}
      />
    </MemoryRouter>,
  )
  return { onClose, onSave, onCriarColaborador }
}

describe('HoleriteRhEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarColaboradoresMock.mockResolvedValue([
      { id: 'c1', nome: 'Ana', matricula: '001' },
      { id: 'c2', nome: 'Bruno', matricula: '002' },
    ])
  })

  it('carrega colaboradores e exibe o título', async () => {
    renderModal()
    expect(screen.getByRole('heading', { name: /Holerite — João da Silva/i })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Ana (001)' })).toBeInTheDocument()
    expect(listarColaboradoresMock).toHaveBeenCalledWith({ ativo: '1' })
  })

  it('exige selecionar colaborador antes de salvar', async () => {
    const { onSave } = renderModal()
    await screen.findByRole('option', { name: 'Ana (001)' })

    fireEvent.click(screen.getByRole('button', { name: 'Salvar vínculo' }))

    expect(await screen.findByText(/Selecione o colaborador cadastrado/i)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('salva o vínculo com os valores normalizados', async () => {
    const { onSave } = renderModal()
    await screen.findByRole('option', { name: 'Ana (001)' })

    fireEvent.change(screen.getByLabelText('Colaborador RH'), { target: { value: 'c1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar vínculo' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        nome: 'João da Silva',
        cpf: '12345678901',
        proventos: '1500.00',
        desconto_inss: '150.00',
        fgts_mes: '120.00',
        colaborador_id: 'c1',
      }),
    )
  })

  it('bloqueia salvar quando há valor monetário inválido', async () => {
    const { onSave } = renderModal()
    await screen.findByRole('option', { name: 'Ana (001)' })

    fireEvent.change(screen.getByLabelText('Colaborador RH'), { target: { value: 'c1' } })
    fireEvent.change(screen.getByLabelText('Proventos'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar vínculo' }))

    expect(await screen.findByText(/Verifique os valores monetários/i)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('mostra aviso do RH e sugestão automática', () => {
    renderModal({
      holerite: holerite({
        aviso_rh: 'Colaborador não cadastrado',
        colaborador_sugerido_nome: 'Ana',
      }),
    })
    expect(screen.getByText('Colaborador não cadastrado')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('aciona criação de colaborador no RH', async () => {
    const { onCriarColaborador } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Criar no RH' }))
    await waitFor(() => expect(onCriarColaborador).toHaveBeenCalledTimes(1))
  })

  it('fecha pelo Cancelar e pela tecla Escape', async () => {
    const { onClose } = renderModal()
    await screen.findByRole('option', { name: 'Ana (001)' })

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(globalThis, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('mostra estados de carregamento dos botões', () => {
    renderModal({ isSubmitting: true })
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  })
})
