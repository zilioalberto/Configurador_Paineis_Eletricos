import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'

import type {
  AnexoSimplesNacional,
  OrigemImportacaoFiscal,
  StatusDocumentoSefazDistribuido,
  StatusImportacaoFiscal,
  StatusManifestacaoDestinatario,
  TipoDocumentoSefazDistribuido,
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
    SEFAZ_SYNC: 'Sincronização SEFAZ',
    ADN_SYNC: 'Sincronização ADN (NFS-e)',
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
    PENDENTE: 'Pendente (sincronização SEFAZ)',
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

export function labelStatusSefazDistribuicao(status: StatusDocumentoSefazDistribuido): string {
  const map: Record<StatusDocumentoSefazDistribuido, string> = {
    RESUMO_RECEBIDO: 'Resumo recebido',
    AGUARDANDO_MANIFESTACAO: 'Aguardando manifestação',
    MANIFESTADO: 'Manifestado',
    XML_IMPORTADO: 'XML importado',
    IGNORADO: 'Ignorado',
    ERRO: 'Erro',
  }
  return map[status] ?? status
}

export function labelTipoSefazDistribuicao(tipo: TipoDocumentoSefazDistribuido): string {
  const map: Record<TipoDocumentoSefazDistribuido, string> = {
    RESUMO_NFE: 'Resumo NF-e',
    NFE_COMPLETA: 'NF-e completa',
    EVENTO: 'Evento',
    OUTRO: 'Outro',
  }
  return map[tipo] ?? tipo
}

export function formatMoedaBrl(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'))
  if (Number.isNaN(n)) return String(valor)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Valor monetário para campo de formulário (ex.: 1118.26 → "1.118,26"). */
export function formatMoedaInput(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return ''
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'))
  if (Number.isNaN(n)) return String(valor)
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Converte entrada pt-BR (1.118,26) para número. */
export function parseMoedaPt(valor: string): number {
  const semEspacos = valor.trim().replaceAll(/\s/g, '')
  const normalizado = semEspacos.includes(',')
    ? semEspacos.replaceAll(/\./g, '').replace(',', '.')
    : semEspacos
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : Number.NaN
}

/** Data ISO (YYYY-MM-DD) para input type="date". */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Data civil local (YYYY-MM-DD), sem deslocamento UTC do `toISOString()`. */
export function dataLocalIso(data: Date = new Date()): string {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const day = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Últimos 12 meses corridos no fuso local do navegador. */
export function periodoUltimos12MesesLocal(): { data_inicio: string; data_fim: string } {
  const hoje = new Date()
  const fim = dataLocalIso(hoje)
  const inicioDate = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
  return { data_inicio: dataLocalIso(inicioDate), data_fim: fim }
}

export function labelAnexoSimples(anexo: AnexoSimplesNacional | string): string {
  if (!anexo || anexo === 'SERVICO') return 'Serviço (Fator R)'
  const map: Record<Exclude<AnexoSimplesNacional, ''>, string> = {
    I: 'Anexo I — Comércio',
    II: 'Anexo II — Indústria',
    III: 'Anexo III — Serviços',
    V: 'Anexo V — Serviços',
    NENHUM: 'Não compõe RBT12',
  }
  return map[anexo as Exclude<AnexoSimplesNacional, ''>] ?? anexo
}

export function labelIncluirFaturamento(incluir: boolean): string {
  return incluir ? 'Compõe faturamento' : 'Não compõe'
}

export function formatCompetencia(competencia: string): string {
  if (!competencia || competencia.length < 7) return competencia || '—'
  const [ano, mes] = competencia.split('-')
  return `${mes}/${ano}`
}
