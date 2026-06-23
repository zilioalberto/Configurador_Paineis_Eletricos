import { describe, expect, it } from 'vitest'

import {
  classificarCstatSefaz,
  formatSefazSyncToast,
  obterAlertaControleNsu,
} from './sefazSyncFeedback'

describe('sefazSyncFeedback', () => {
  it('classifica cStats conhecidos', () => {
    expect(classificarCstatSefaz('137')).toBe('sucesso')
    expect(classificarCstatSefaz('656')).toBe('bloqueio')
    expect(classificarCstatSefaz('280')).toBe('erro')
  })

  it('monta toast de erro com cStat e motivo', () => {
    const toast = formatSefazSyncToast({
      sucesso: false,
      mensagem: 'Certificado digital inválido ou não reconhecido pela SEFAZ.',
      ciclos_executados: 1,
      documentos_importados: 0,
      documentos_novos: 0,
      documentos_duplicados: 0,
      erros_importacao: [],
      alertas: ['SEFAZ cStat 280: Certificado inválido'],
      ultimo_cstat: '280',
      ultimo_motivo: 'Certificado inválido',
      ultimo_nsu: '000000000000000',
      max_nsu: '000000000000000',
      manifestacoes_processadas: 0,
    })

    expect(toast.variant).toBe('danger')
    expect(toast.message).toContain('280')
  })

  it('alerta controle NSU para bloqueio', () => {
    const alerta = obterAlertaControleNsu({
      id: 1,
      cnpj: '11222333000199',
      ultimo_nsu: '0',
      max_nsu: '0',
      ultimo_cstat: '656',
      ultimo_motivo: 'Consumo Indevido',
      bloqueado_ate: new Date(Date.now() + 60_000).toISOString(),
      ultima_consulta: null,
      criado_em: '',
      atualizado_em: '',
    })

    expect(alerta?.variant).toBe('warning')
    expect(alerta?.mensagem).toContain('656')
  })

  it('alerta controle NSU para espera após cStat 137 sem chamar de consumo indevido', () => {
    const alerta = obterAlertaControleNsu({
      id: 1,
      cnpj: '11222333000199',
      ultimo_nsu: '50',
      max_nsu: '4187',
      ultimo_cstat: '137',
      ultimo_motivo: 'Nenhum documento localizado',
      bloqueado_ate: new Date(Date.now() + 60_000).toISOString(),
      ultima_consulta: null,
      criado_em: '',
      atualizado_em: '',
    })

    expect(alerta?.variant).toBe('warning')
    expect(alerta?.titulo).toContain('Aguardando')
    expect(alerta?.mensagem).not.toContain('Consumo indevido')
  })
})
