import type { ControleNsuDto } from '../types/documentoFiscalRecebido'
import type { SincronizarNfesSefazResponse } from '../services/fiscalNfeService'

const CSTAT_SUCESSO = new Set(['137', '138'])
const CSTAT_BLOQUEIO = new Set(['656'])

export type SefazCstatTipo = 'sucesso' | 'bloqueio' | 'erro' | 'desconhecido'

export function classificarCstatSefaz(cstat: string | null | undefined): SefazCstatTipo {
  const codigo = (cstat ?? '').trim()
  if (CSTAT_SUCESSO.has(codigo)) return 'sucesso'
  if (CSTAT_BLOQUEIO.has(codigo)) return 'bloqueio'
  if (codigo) return 'erro'
  return 'desconhecido'
}

export function formatarAlertaCstatSefaz(
  cstat: string | null | undefined,
  motivo: string | null | undefined,
): string {
  const codigo = (cstat ?? '').trim()
  const texto = (motivo ?? '').trim()
  if (codigo && texto) return `SEFAZ cStat ${codigo}: ${texto}`
  if (codigo) return `SEFAZ cStat ${codigo}`
  return texto
}

export function nsuBloqueadoAgora(bloqueadoAte: string | null | undefined): boolean {
  if (!bloqueadoAte) return false
  return new Date(bloqueadoAte).getTime() > Date.now()
}

export type SefazControleNsuAlerta = {
  readonly variant: 'warning' | 'danger'
  readonly titulo: string
  readonly mensagem: string
}

function alertaNsuEmEspera(nsu: ControleNsuDto): SefazControleNsuAlerta {
  if (nsu.ultimo_cstat === '137') {
    return {
      variant: 'warning',
      titulo: 'Aguardando próxima consulta SEFAZ',
      mensagem:
        'A SEFAZ informou que não há documentos localizados nesta janela. Aguarde o horário indicado para consultar novamente.',
    }
  }
  return {
    variant: 'warning',
    titulo: 'Consulta SEFAZ bloqueada',
    mensagem:
      formatarAlertaCstatSefaz(nsu.ultimo_cstat, nsu.ultimo_motivo) ||
      'Consumo indevido detectado pela SEFAZ. Aguarde o horário indicado em "Bloqueado até".',
  }
}

export function obterAlertaControleNsu(
  nsu: ControleNsuDto | null | undefined,
): SefazControleNsuAlerta | null {
  if (!nsu) return null

  if (nsuBloqueadoAgora(nsu.bloqueado_ate)) {
    return alertaNsuEmEspera(nsu)
  }

  const tipo = classificarCstatSefaz(nsu.ultimo_cstat)
  if (tipo === 'erro' || tipo === 'desconhecido') {
    return {
      variant: 'danger',
      titulo: 'Erro na última consulta SEFAZ',
      mensagem:
        formatarAlertaCstatSefaz(nsu.ultimo_cstat, nsu.ultimo_motivo) ||
        'A última resposta da SEFAZ não pôde ser interpretada.',
    }
  }

  return null
}

function resumoDocumentos(res: SincronizarNfesSefazResponse): string {
  if (res.documentos_novos > 0) {
    return `${res.documentos_novos} nova(s) NF-e(s).`
  }
  if (res.documentos_duplicados > 0) {
    return 'Nenhuma NF-e nova (já importadas).'
  }
  if (res.ultimo_cstat === '137') {
    return 'Nenhum documento novo na SEFAZ.'
  }
  return 'Nenhum documento importado nesta consulta.'
}

function montarMensagemSync(res: SincronizarNfesSefazResponse): string {
  const partes: string[] = []
  if (res.mensagem) partes.push(res.mensagem)
  if (res.ultimo_cstat) {
    const cstat = `cStat ${res.ultimo_cstat}`
    const motivo = res.ultimo_motivo ? ` — ${res.ultimo_motivo}` : ''
    if (!res.mensagem?.includes(res.ultimo_cstat)) {
      partes.push(`${cstat}${motivo}`)
    }
  }
  for (const alerta of res.alertas ?? []) {
    if (alerta && !partes.includes(alerta)) partes.push(alerta)
  }
  for (const erro of res.erros_importacao ?? []) {
    if (erro && !partes.includes(erro)) partes.push(erro)
  }
  if (res.sucesso) {
    partes.push(resumoDocumentos(res))
  }
  return partes.join(' ').trim()
}

export function formatSefazSyncToast(res: SincronizarNfesSefazResponse): {
  variant: 'success' | 'warning' | 'danger'
  title: string
  message: string
} {
  const message = montarMensagemSync(res)
  if (!res.sucesso) {
    const tipo = classificarCstatSefaz(res.ultimo_cstat)
    return {
      variant: tipo === 'bloqueio' ? 'warning' : 'danger',
      title: tipo === 'bloqueio' ? 'Consulta SEFAZ bloqueada' : 'Falha na sincronização',
      message,
    }
  }

  const parcial =
    (res.alertas?.length ?? 0) > 0 ||
    (res.erros_importacao?.length ?? 0) > 0 ||
    res.documentos_novos === 0

  return {
    variant: parcial && res.documentos_novos === 0 ? 'warning' : 'success',
    title: 'Sincronização concluída',
    message,
  }
}
