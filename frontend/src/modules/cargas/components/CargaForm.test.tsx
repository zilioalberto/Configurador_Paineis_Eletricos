import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Projeto } from '@/modules/projetos/types/projeto'
import CargaForm from '@/modules/cargas/components/CargaForm'
import { applyTipoChange, cargaFormInitial } from '@/modules/cargas/utils/cargaFormDefaults'

const onSubmit = vi.fn().mockResolvedValue(undefined)

function projetoBase(over: Partial<Projeto> = {}): Projeto {
  return {
    id: 'proj-1',
    nome: 'P',
    codigo: 'C-1',
    status: 'EM_ANDAMENTO',
    possui_plc: false,
    ...over,
  } as Projeto
}

describe('CargaForm', () => {
  it('submete dados quando válidos', async () => {
    onSubmit.mockClear()
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'Motor principal'
    initial.tag = 'M01'

    render(
      <CargaForm
        projetos={[projetoBase()]}
        initialData={initial}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Salvar carga/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].projeto).toBe('proj-1')
    expect(onSubmit.mock.calls[0][0].descricao).toBe('Motor principal')
  })

  it('aplica tag sugerida quando o campo ainda está vazio', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.tag = ''

    const { rerender } = render(
      <CargaForm
        projetos={[projetoBase()]}
        initialData={initial}
        onSubmit={onSubmit}
        suggestedTag="M02"
      />
    )

    await waitFor(() => {
      expect((screen.getByPlaceholderText(/M01/i) as HTMLInputElement).value).toBe('M02')
    })

    rerender(
      <CargaForm
        projetos={[projetoBase()]}
        initialData={initial}
        onSubmit={onSubmit}
        suggestedTag="M03"
      />
    )

    await waitFor(() => {
      expect((screen.getByPlaceholderText(/M01/i) as HTMLInputElement).value).toBe('M03')
    })
  })

  it('recalcula IO do motor ao alterar tipo de partida na edição', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.tag = 'M01'
    initial.descricao = 'Motor editado'
    initial.exige_comando = true
    initial.quantidade_entradas_digitais = 1
    initial.quantidade_saidas_digitais = 1
    if (initial.motor) {
      initial.motor.tipo_partida = 'DIRETA'
      initial.motor.reversivel = false
      initial.motor.freio_motor = false
    }

    render(
      <CargaForm
        projetos={[projetoBase({ possui_plc: true })]}
        initialData={initial}
        onSubmit={onSubmit}
        lockProjeto
      />
    )

    const tipoPartida = screen
      .getAllByRole('combobox')
      .find((el) => (el as HTMLSelectElement).value === 'DIRETA')
    expect(tipoPartida).toBeDefined()
    if (!tipoPartida) throw new Error('Campo tipo_partida não encontrado')
    fireEvent.change(tipoPartida, { target: { value: 'ESTRELA_TRIANGULO' } })

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Saídas digitais/i) as HTMLInputElement).value
      ).toBe('3')
    })
  })

  it('zera e desabilita quantidades de IO quando exige comando fica false', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.tag = 'M10'
    initial.descricao = 'Motor sem comando'
    initial.exige_comando = true

    render(
      <CargaForm
        projetos={[projetoBase({ possui_plc: true })]}
        initialData={initial}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByLabelText(/Exige comando/i))

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Entradas digitais/i) as HTMLInputElement).value
      ).toBe('0')
      expect(
        (screen.getByLabelText(/Saídas digitais/i) as HTMLInputElement).value
      ).toBe('0')
      expect(screen.getByLabelText(/Entradas digitais/i)).toBeDisabled()
      expect(screen.getByLabelText(/Saídas digitais/i)).toBeDisabled()
    })
  })

  it('mostra aviso de I/O quando o projeto não tem PLC', () => {
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'Alguma'
    initial.tag = 'X1'
    render(
      <CargaForm projetos={[projetoBase()]} initialData={initial} onSubmit={onSubmit} />
    )
    expect(
      screen.getByText(/Ocupação de entradas e saídas digitais\/analógicas só pode ser/i)
    ).toBeInTheDocument()
  })

  it('com motor direta e PLC oculta ocupação analógica no painel', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'Motor'
    initial.tag = 'M01'
    initial.exige_comando = true
    initial.quantidade_entradas_analogicas = 2
    initial.quantidade_saidas_analogicas = 2
    if (initial.motor) initial.motor.tipo_partida = 'DIRETA'

    render(
      <CargaForm
        projetos={[projetoBase({ possui_plc: true })]}
        initialData={initial}
        onSubmit={onSubmit}
      />
    )

    await waitFor(() => {
      expect(screen.queryByLabelText(/^Entradas analógicas$/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/^Saídas analógicas$/)).not.toBeInTheDocument()
    })
  })

  it('tipo Transmissor mostra mensagem sem parâmetros extra', () => {
    const initial = applyTipoChange(cargaFormInitial('proj-1'), 'TRANSMISSOR')
    initial.descricao = 'Tx'
    initial.tag = 'TX1'
    render(
      <CargaForm projetos={[projetoBase()]} initialData={initial} onSubmit={onSubmit} />
    )
    expect(
      screen.getByText(/Não há parâmetros específicos adicionais para este tipo no sistema/i)
    ).toBeInTheDocument()
  })

  it('válvula com acionamento relé de interface mostra tipo de relé', async () => {
    const initial = applyTipoChange(cargaFormInitial('proj-1'), 'VALVULA')
    initial.descricao = 'Válvula'
    initial.tag = 'YV01'
    render(
      <CargaForm projetos={[projetoBase()]} initialData={initial} onSubmit={onSubmit} />
    )

    const combos = screen.getAllByRole('combobox')
    // projeto, tipo, tipo válvula, tensão, tipo corrente, proteção, acionamento
    fireEvent.change(combos[6], { target: { value: 'RELE_INTERFACE' } })

    await waitFor(() => {
      const label = screen.getByText(/^Tipo de relé de interface$/i)
      expect(label.closest('.col-md-4')?.querySelector('select')).toBeTruthy()
    })
  })

  it('resistência com acionamento relé de interface mostra tipo de relé', async () => {
    const initial = applyTipoChange(cargaFormInitial('proj-1'), 'RESISTENCIA')
    initial.descricao = 'Res'
    initial.tag = 'R01'
    render(
      <CargaForm projetos={[projetoBase()]} initialData={initial} onSubmit={onSubmit} />
    )

    const combos = screen.getAllByRole('combobox')
    // projeto, tipo, fases, tensão, conexão, proteção, acionamento
    fireEvent.change(combos[6], { target: { value: 'RELE_INTERFACE' } })

    await waitFor(() => {
      const label = screen.getByText(/^Tipo de relé de interface$/i)
      expect(label.closest('.col-md-4')?.querySelector('select')).toBeTruthy()
    })
  })

  it('transdutor com PLC e comando sugere uma entrada analógica', async () => {
    const initial = applyTipoChange(cargaFormInitial('proj-1'), 'TRANSDUTOR')
    initial.descricao = 'Pressão'
    initial.tag = 'PT01'
    initial.exige_comando = true

    render(
      <CargaForm
        projetos={[projetoBase({ possui_plc: true })]}
        initialData={initial}
        onSubmit={onSubmit}
      />
    )

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/^Entradas analógicas$/i) as HTMLInputElement).value
      ).toBe('1')
    })
  })

  it('quantidade inválida volta para 1 ao alterar o campo', async () => {
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'M'
    initial.tag = 'M01'
    render(
      <CargaForm projetos={[projetoBase()]} initialData={initial} onSubmit={onSubmit} />
    )

    const qtd = document.querySelector(
      'input[name="quantidade"]'
    ) as HTMLInputElement
    fireEvent.change(qtd, { target: { value: '-5', name: 'quantidade', type: 'number' } })

    await waitFor(() => {
      expect((qtd as HTMLInputElement).value).toBe('1')
    })
  })

  it('notifica onChange quando o formulário evolui', async () => {
    const onChange = vi.fn()
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'X'
    initial.tag = 'T1'
    render(
      <CargaForm projetos={[projetoBase()]} initialData={initial} onSubmit={onSubmit} onChange={onChange} />
    )
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const calls = onChange.mock.calls.length
    fireEvent.change(screen.getByPlaceholderText(/M01/i), { target: { value: 'T2', name: 'tag' } })
    await waitFor(() => expect(onChange.mock.calls.length).toBeGreaterThan(calls))
  })

  it('desabilita seleção de projeto quando lockProjeto', () => {
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'D'
    initial.tag = 'Z1'
    render(
      <CargaForm
        projetos={[projetoBase()]}
        initialData={initial}
        onSubmit={onSubmit}
        lockProjeto
      />
    )
    expect(screen.getAllByRole('combobox')[0]).toBeDisabled()
  })

  it('sensor encoder define entrada rápida quando PLC e comando', async () => {
    const initial = applyTipoChange(cargaFormInitial('proj-1'), 'SENSOR')
    initial.descricao = 'Sensor'
    initial.tag = 'S01'
    initial.exige_comando = true
    if (initial.sensor) initial.sensor.tipo_sensor = 'ENCODER'

    render(
      <CargaForm
        projetos={[projetoBase({ possui_plc: true })]}
        initialData={initial}
        onSubmit={onSubmit}
      />
    )

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/^Entradas rápidas$/i) as HTMLInputElement).value
      ).toBe('1')
    })
  })

  it('renderiza bloco Motor com rendimento quando unidade não é amperes', () => {
    const initial = cargaFormInitial('proj-1')
    initial.descricao = 'Motor'
    initial.tag = 'M01'
    if (initial.motor) initial.motor.potencia_corrente_unidade = 'CV'
    render(
      <CargaForm projetos={[projetoBase()]} initialData={initial} onSubmit={onSubmit} />
    )
    expect(screen.getByDisplayValue('85.00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0.85')).toBeInTheDocument()
  })
})
