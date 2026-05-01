import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EspecificacaoCatalogoFields from './EspecificacaoCatalogoFields'

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
