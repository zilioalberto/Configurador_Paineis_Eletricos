import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import EspecificacaoCatalogoFields from './EspecificacaoCatalogoFields'

vi.mock('../hooks/usePlcFamiliasQuery', () => ({
  usePlcFamiliasQuery: () => ({ data: { familias: [] } }),
}))

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('EspecificacaoCatalogoFields - DCM conditional fields', () => {
  it('oculta campos de ajuste quando configuracao e fixa', () => {
    render(
      <EspecificacaoCatalogoFields
        categoria="DISJUNTOR_CAIXA_MOLDADA"
        value={{
          configuracao_disparador: 'TERMOMAGNETICO_IR_II_FIXOS',
          disparador_sobrecarga_ir_ajuste_min_a: '80',
          disparador_sobrecarga_ir_ajuste_max_a: '100',
          disparador_curto_ii_ajuste_min_a: '500',
          disparador_curto_ii_ajuste_max_a: '1000',
        }}
        onPatch={vi.fn()}
      />
    )

    expect(
      screen.queryByLabelText(/Disparador Sobrecarga Ir Ajuste Min A/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Disparador Sobrecarga Ir Ajuste Max A/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Disparador Curto Ii Ajuste Min A/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Disparador Curto Ii Ajuste Max A/i)
    ).not.toBeInTheDocument()
  })

  it('limpa campos incompativeis ao trocar configuracao', () => {
    const onPatch = vi.fn()
    render(
      <EspecificacaoCatalogoFields
        categoria="DISJUNTOR_CAIXA_MOLDADA"
        value={{ configuracao_disparador: 'TERMOMAGNETICO_IR_II_FIXOS' }}
        onPatch={onPatch}
      />
    )

    fireEvent.change(screen.getByLabelText(/Configuracao Disparador/i), {
      target: { value: 'TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO' },
    })

    expect(onPatch).toHaveBeenCalledWith({
      configuracao_disparador: 'TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO',
      disparador_sobrecarga_ir_fixo_a: '',
      disparador_curto_ii_ajuste_min_a: '',
      disparador_curto_ii_ajuste_max_a: '',
    })
  })
})

describe('EspecificacaoCatalogoFields - rele estado solido', () => {
  it('oculta tipo dissipador e tensao ventilacao quando flags estao desmarcadas', () => {
    render(
      <EspecificacaoCatalogoFields
        categoria="RELE_ESTADO_SOLIDO"
        value={{
          possui_dissipador: false,
          possui_ventilacao: false,
          tipo_dissipador: 'INTEGRADO',
          tensao_ventilacao_v: 24,
        }}
        onPatch={vi.fn()}
      />
    )

    expect(screen.queryByLabelText(/Tipo Dissipador/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Tensao Ventilacao V/i)).not.toBeInTheDocument()
  })

  it('limpa campos dependentes ao desmarcar flags', () => {
    const onPatch = vi.fn()
    render(
      <EspecificacaoCatalogoFields
        categoria="RELE_ESTADO_SOLIDO"
        value={{ possui_dissipador: true, possui_ventilacao: true }}
        onPatch={onPatch}
      />
    )

    fireEvent.click(screen.getByLabelText(/Possui Dissipador/i))
    expect(onPatch).toHaveBeenCalledWith({
      possui_dissipador: false,
      tipo_dissipador: '',
    })

    fireEvent.click(screen.getByLabelText(/Possui Ventilacao/i))
    expect(onPatch).toHaveBeenCalledWith({
      possui_ventilacao: false,
      tensao_ventilacao_v: '',
    })
  })
})

describe('EspecificacaoCatalogoFields - BORNE (campos genéricos)', () => {
  it('renderiza campos da especificação e propaga alteração', () => {
    const onPatch = vi.fn()
    render(
      <EspecificacaoCatalogoFields
        categoria="BORNE"
        value={{ tipo_borne: 'PARAFUSO', secao_min_mm2: '1.5' }}
        onPatch={onPatch}
      />,
    )
    expect(screen.getByLabelText(/Tipo Borne/i)).toBeInTheDocument()
    const secaoMin = screen.getByLabelText(/Secao Min Mm2/i)
    expect(secaoMin).toHaveValue('1.5')
    fireEvent.change(secaoMin, { target: { value: '2.5' } })
    expect(onPatch).toHaveBeenCalledWith({ secao_min_mm2: '2.5' })
  })
})

describe('EspecificacaoCatalogoFields - regras específicas adicionais', () => {
  it('troca opções de tamanho do fusível conforme formato e limpa tamanho', () => {
    const onPatch = vi.fn()
    const { rerender } = render(
      <EspecificacaoCatalogoFields
        categoria="FUSIVEL"
        value={{ formato: 'NH', tamanho: 'NH00' }}
        onPatch={onPatch}
      />,
    )

    expect(screen.getByRole('option', { name: 'NH00' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '10 x 38 mm' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Formato/i), {
      target: { value: 'CARTUCHO' },
    })
    expect(onPatch).toHaveBeenCalledWith({ formato: 'CARTUCHO', tamanho: '' })

    rerender(
      <EspecificacaoCatalogoFields
        categoria="FUSIVEL"
        value={{ formato: 'CARTUCHO', tamanho: '10x38' }}
        onPatch={onPatch}
      />,
    )
    expect(screen.getByRole('option', { name: '10 x 38 mm' })).toBeInTheDocument()
  })

  it('oculta cor de painel inox e limpa cor ao selecionar material inox', () => {
    const onPatch = vi.fn()
    render(
      <EspecificacaoCatalogoFields
        categoria="PAINEL"
        value={{ material: 'ACO_CARBONO', cor: 'RAL7035' }}
        onPatch={onPatch}
      />,
    )

    expect(screen.getByLabelText(/Cor/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Material/i), {
      target: { value: 'ACO_INOX' },
    })
    expect(onPatch).toHaveBeenCalledWith({ material: 'ACO_INOX', cor: '' })
  })

  it('limpa tipo analogico de expansao quando entradas e saidas analogicas zeram', () => {
    const onPatch = vi.fn()
    renderWithQueryClient(
      <EspecificacaoCatalogoFields
        categoria="EXPANSAO_PLC"
        value={{
          entradas_analogicas: 1,
          saidas_analogicas: 0,
          tipo_sinal_analogico: 'CORRENTE_4_20MA',
        }}
        onPatch={onPatch}
      />,
    )

    expect(screen.getByLabelText(/Tipo de sinal analógico/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Entradas Analogicas/i), {
      target: { value: '0' },
    })

    expect(onPatch).toHaveBeenCalledWith({
      entradas_analogicas: 0,
      tipo_sinal_analogico: '',
    })
  })

  it('limpa campos analogicos de plc quando quantidade fica vazia ou zero', () => {
    const onPatch = vi.fn()
    renderWithQueryClient(
      <EspecificacaoCatalogoFields
        categoria="PLC"
        value={{
          entradas_analogicas: 1,
          tipo_entradas_analogicas: 'CORRENTE_4_20MA',
          saidas_analogicas: 1,
          tipo_saidas_analogicas: 'TENSAO_0_10V',
        }}
        onPatch={onPatch}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Entradas Analogicas/i), {
      target: { value: '' },
    })
    expect(onPatch).toHaveBeenCalledWith({
      entradas_analogicas: '',
      tipo_entradas_analogicas: '',
    })

    fireEvent.change(screen.getByLabelText(/Saidas Analogicas/i), {
      target: { value: '0' },
    })
    expect(onPatch).toHaveBeenCalledWith({
      saidas_analogicas: 0,
      tipo_saidas_analogicas: '',
    })
  })

  it('propaga familia de plc e limpa entrada analogica ao zerar quantidade', () => {
    const onPatch = vi.fn()
    renderWithQueryClient(
      <EspecificacaoCatalogoFields
        categoria="PLC"
        value={{
          familia: 'S7-1200',
          entradas_analogicas: 1,
          tipo_entradas_analogicas: 'CORRENTE_4_20MA',
        }}
        onPatch={onPatch}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Família do PLC/i), {
      target: { value: 'Logo 8' },
    })
    expect(onPatch).toHaveBeenCalledWith({ familia: 'Logo 8' })

    fireEvent.change(screen.getByLabelText(/Entradas Analogicas/i), {
      target: { value: '0' },
    })
    expect(onPatch).toHaveBeenCalledWith({
      entradas_analogicas: 0,
      tipo_entradas_analogicas: '',
    })
  })

  it('trata saidas analogicas de expansao quando ficam vazias ou positivas', () => {
    const onPatch = vi.fn()
    const { rerender } = renderWithQueryClient(
      <EspecificacaoCatalogoFields
        categoria="EXPANSAO_PLC"
        value={{
          entradas_analogicas: 0,
          saidas_analogicas: 1,
          tipo_sinal_analogico: 'CORRENTE_4_20MA',
        }}
        onPatch={onPatch}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Saidas Analogicas/i), {
      target: { value: '' },
    })
    expect(onPatch).toHaveBeenCalledWith({
      saidas_analogicas: '',
      tipo_sinal_analogico: '',
    })

    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <EspecificacaoCatalogoFields
          categoria="EXPANSAO_PLC"
          value={{ entradas_analogicas: 0, saidas_analogicas: 0 }}
          onPatch={onPatch}
        />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText(/Saidas Analogicas/i), {
      target: { value: '1' },
    })
    expect(onPatch).toHaveBeenCalledWith({ saidas_analogicas: 1 })
  })

  it('propaga inteiro comum e texto longo sem regra especial', () => {
    const onPatch = vi.fn()
    render(
      <EspecificacaoCatalogoFields
        categoria="TEMPORIZADOR"
        value={{ quantidade_contatos: 1, observacoes: 'Inicial' }}
        onPatch={onPatch}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Quantidade Contatos/i), {
      target: { value: '3' },
    })
    expect(onPatch).toHaveBeenCalledWith({ quantidade_contatos: 3 })

    fireEvent.change(screen.getByLabelText(/Observacoes/i), {
      target: { value: 'Uso em painel principal' },
    })
    expect(onPatch).toHaveBeenCalledWith({ observacoes: 'Uso em painel principal' })
  })

  it('propaga select numerico e checkbox sem regra especial', () => {
    const onPatch = vi.fn()
    render(
      <EspecificacaoCatalogoFields
        categoria="TEMPORIZADOR"
        value={{ tensao_alimentacao_v: 24 }}
        onPatch={onPatch}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Tensao Alimentacao V/i), {
      target: { value: '110' },
    })
    expect(onPatch).toHaveBeenCalledWith({ tensao_alimentacao_v: 110 })

    fireEvent.change(screen.getByLabelText(/Tensao Alimentacao V/i), {
      target: { value: '' },
    })
    expect(onPatch).toHaveBeenCalledWith({ tensao_alimentacao_v: '' })

    const onPatchSwitch = vi.fn()
    render(
      <EspecificacaoCatalogoFields
        categoria="SWITCH_REDE"
        value={{ possui_poe: false }}
        onPatch={onPatchSwitch}
      />,
    )
    fireEvent.click(screen.getByLabelText(/Possui Poe/i))
    expect(onPatchSwitch).toHaveBeenCalledWith({ possui_poe: true })
  })
})
