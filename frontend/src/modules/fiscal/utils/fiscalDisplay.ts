import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'

import type {
  OrigemImportacaoFiscal,
  StatusImportacaoFiscal,
  StatusManifestacaoDestinatario,
  TipoManifestacaoDestinatario,
} from '../types/documentoFiscalRecebido'

/** CNPJ de 14 dígitos para exibição mascarada. */
export function formatCnpjExibicao(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj || '—'
  return aplicarMascaraCnpj(d)
}

/** Chave de acesso (44) com espaços a cada 4 dígitos. */
export function formatChaveAcesso(chave: string): string {
  const d = chave.replace(/\D/g, '')
  if (!d) return '—'
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function labelStatusImportacao(status: StatusImportacaoFiscal): string {
  const map: Record<StatusImportacaoFiscal, string> = {
    RECEBIDA: 'Recebida',
    PROCESSADA: 'Processada',
    ERRO: 'Erro',
    IGNORADA: 'Ignorada',
  }
  return map[status] ?? status
}

export function labelOrigemImportacao(origem: OrigemImportacaoFiscal): string {
  const map: Record<OrigemImportacaoFiscal, string> = {
    MANUAL: 'Manual (portal)',
    PONTE_A3: 'Ponte A3 / SEFAZ',
    API: 'API',
    OUTRO: 'Outro',
  }
  return map[origem] ?? origem
}

export function formatDataIso(data: string | null | undefined): string {
  if (!data) return '—'
  const parsed = new Date(data)
  if (Number.isNaN(parsed.getTime())) return data
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function labelStatusManifestacao(status: StatusManifestacaoDestinatario): string {
  const map: Record<StatusManifestacaoDestinatario, string> = {
    NAO_SOLICITADA: 'Não solicitada',
    PENDENTE: 'Pendente (ponte A3)',
    MANIFESTADA: 'Registrada na SEFAZ',
    ERRO: 'Erro na última tentativa',
  }
  return map[status] ?? status
}

export function labelTipoManifestacao(tipo: TipoManifestacaoDestinatario | ''): string {
  if (!tipo) return '—'
  const map: Record<TipoManifestacaoDestinatario, string> = {
    CIENCIA: 'Ciência da operação',
    CONFIRMACAO: 'Confirmação da operação',
    DESCONHECIMENTO: 'Desconhecimento',
    NAO_REALIZADA: 'Operação não realizada',
  }
  return map[tipo] ?? tipo
}

export function formatMoedaBrl(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'))
  if (Number.isNaN(n)) return String(valor)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
