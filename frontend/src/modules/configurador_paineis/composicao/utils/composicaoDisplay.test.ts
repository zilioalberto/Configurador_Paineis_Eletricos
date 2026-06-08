import { describe, expect, it } from 'vitest'
import {
  em,
  formatNumeroFasesCarga,
  formatPotenciaCarga,
  LEGENDA_DESCR_PROTECAO_GERAL,
  LEGENDA_DESCR_SECCIONAMENTO,
  montarNomeArquivoProjeto,
  textoDescricaoCarga,
  textoDescricaoItemPainelSemCarga,
} from './composicaoDisplay'

describe('composicaoDisplay', () => {
  it('em retorna traço para vazio', () => {
    expect(em(null)).toBe('—')
    expect(em('')).toBe('—')
    expect(em('valor')).toBe('valor')
  })

  it('montarNomeArquivoProjeto junta partes não vazias', () => {
    expect(montarNomeArquivoProjeto('P-01', 'Cliente X', 'Painel A')).toBe(
      'P-01 - Cliente X - Painel A'
    )
    expect(montarNomeArquivoProjeto('P-01', '', 'Painel A')).toBe('P-01 - Painel A')
  })

  it('formatPotenciaCarga converte W para kW', () => {
    expect(
      formatPotenciaCarga({
        potencia_corrente_valor: '1500',
        potencia_corrente_unidade: 'W',
      } as never)
    ).toMatch(/1,5.*kW/)
  })

  it('textoDescricaoCarga e formatNumeroFasesCarga', () => {
    expect(textoDescricaoCarga(null)).toBe('—')
    expect(textoDescricaoCarga({ descricao: 'Motor' } as never)).toBe('Motor')
    expect(formatNumeroFasesCarga({ numero_fases_carga_display: 'Trifásico' } as never)).toBe(
      'Trifásico'
    )
    expect(formatNumeroFasesCarga({ numero_fases_carga: 3 } as never)).toBe('3')
  })

  it('textoDescricaoItemPainelSemCarga distingue seccionamento e proteção geral', () => {
    expect(textoDescricaoItemPainelSemCarga('SECCIONAMENTO')).toBe(
      LEGENDA_DESCR_SECCIONAMENTO
    )
    expect(textoDescricaoItemPainelSemCarga('PROTECAO_GERAL')).toBe(
      LEGENDA_DESCR_PROTECAO_GERAL
    )
  })
})
