import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ReconciliacaoContabilidadeEditModal,
  type ReconciliacaoContabilidadePayload,
} from './ReconciliacaoContabilidadeEditModal'
import type { ReconciliacaoFiscalDto } from '../services/fiscalObrigacoesService'

function rec(overrides: Partial<ReconciliacaoFiscalDto> = {}): ReconciliacaoFiscalDto {
  return {
    tipo: 'INSS',
    tipo_label: 'INSS',
    valor_interno: '100.00',
    valor_contabilidade: '100.00',
    diferenca: '0.00',
    diferenca_percentual: '0.00',
    status: 'OK',
    status_label: 'OK',
    mensagem: '',
    detalhes: {},
    fonte_contabilidade: 'pdf',
    editavel: true,
    ...overrides,
  }
}

type Props = {
  reconciliacao: ReconciliacaoFiscalDto
  isSubmitting?: boolean
  onClose?: () => void
  onSave?: (p: ReconciliacaoContabilidadePayload) => Promise<void>
}

function renderModal({ reconciliacao, isSubmitting = false, onClose = vi.fn(), onSave }: Props) {
  const save = onSave ?? vi.fn().mockResolvedValue(undefined)
  render(
    <ReconciliacaoContabilidadeEditModal
      reconciliacao={reconciliacao}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSave={save}
    />,
  )
  return { onClose, save }
}

describe('ReconciliacaoContabilidadeEditModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('salva valor contábil simples válido', async () => {
    const { save } = renderModal({ reconciliacao: rec() })

    fireEvent.change(screen.getByLabelText('Valor contabilidade (R$)'), {
      target: { value: '1.118,26' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ valor_contabilidade: '1118.26' }),
    )
  })

  it('bloqueia valor inválido e mostra erro', async () => {
    const { save } = renderModal({ reconciliacao: rec() })

    fireEvent.change(screen.getByLabelText('Valor contabilidade (R$)'), {
      target: { value: 'abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/Informe um valor válido/i)).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('mostra dica de INSS 1006 para DAS_INSS', () => {
    renderModal({ reconciliacao: rec({ tipo: 'DAS_INSS', tipo_label: 'DAS/INSS' }) })
    expect(screen.getByText(/INSS cód. 1006/i)).toBeInTheDocument()
  })

  it('para ICMS salva entradas e saídas', async () => {
    const { save } = renderModal({
      reconciliacao: rec({
        tipo: 'ICMS',
        tipo_label: 'ICMS',
        detalhes: { dime_entradas: '300.00', dime_saidas: '500.00' },
      }),
    })

    fireEvent.change(screen.getByLabelText(/entradas contábeis/i), {
      target: { value: '300,00' },
    })
    fireEvent.change(screen.getByLabelText(/saídas contábeis/i), {
      target: { value: '500,00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        icms_entradas: '300.00',
        icms_saidas: '500.00',
        valor_contabilidade: '500.00',
      }),
    )
  })

  it('valida entradas/saídas inválidas no ICMS', async () => {
    const { save } = renderModal({
      reconciliacao: rec({ tipo: 'ICMS', tipo_label: 'ICMS' }),
    })

    fireEvent.change(screen.getByLabelText(/entradas contábeis/i), {
      target: { value: 'xx' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByText(/valores válidos para entradas e saídas/i),
    ).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('fecha pelo Cancelar, backdrop e tecla Escape', () => {
    const onClose = vi.fn()
    renderModal({ reconciliacao: rec(), onClose })

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('desabilita ações e mostra "Salvando…" enquanto envia', () => {
    renderModal({ reconciliacao: rec(), isSubmitting: true })
    const submit = screen.getByRole('button', { name: 'Salvando…' })
    expect(submit).toBeDisabled()
  })

  it('indica quando o valor foi informado manualmente', () => {
    renderModal({ reconciliacao: rec({ fonte_contabilidade: 'manual' }) })
    expect(screen.getByText(/Valor informado manualmente/i)).toBeInTheDocument()
  })
})
