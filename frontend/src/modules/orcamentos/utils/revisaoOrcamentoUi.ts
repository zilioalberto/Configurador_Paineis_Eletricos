import type { OrcamentoDto, OrcamentoRevisaoResumoDto } from '../types/orcamentos'

export type LinhaHistoricoRevisao = OrcamentoRevisaoResumoDto & {
  atual: boolean
}

export function rotuloTipoRevisaoOrcamento(tipo: OrcamentoDto['tipo_revisao']): string {
  if (tipo === 'COMERCIAL') return 'Comercial'
  if (tipo === 'TECNICA') return 'Técnica'
  return 'Inicial'
}

/** Esta revisão é a ponta da linha (única que pode ser reaberta). */
export function ehUltimaRevisaoOrcamento(orcamento: OrcamentoDto): boolean {
  return (orcamento.revisoes_derivadas ?? []).length === 0
}

export function montarHistoricoRevisoes(orcamento: OrcamentoDto): LinhaHistoricoRevisao[] {
  const atual: LinhaHistoricoRevisao = {
    id: orcamento.id,
    codigo: orcamento.codigo,
    codigo_base: orcamento.codigo_base,
    revisao: orcamento.revisao,
    tipo_revisao: orcamento.tipo_revisao,
    status: orcamento.status,
    titulo: orcamento.titulo,
    criado_em: orcamento.criado_em,
    atualizado_em: orcamento.atualizado_em,
    snapshot_envio: orcamento.snapshot_envio ?? null,
    atual: true,
  }
  const derivadas: LinhaHistoricoRevisao[] = (orcamento.revisoes_derivadas ?? []).map((rev) => ({
    ...rev,
    atual: false,
  }))
  return [atual, ...derivadas].sort(
    (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
  )
}

/** Alinhado a `_REVISOES_PERMITIDAS_ORIGEM` no backend. */
export const STATUS_PERMITE_NOVA_REVISAO = new Set([
  'FINALIZADO',
  'ENVIADO',
  'APROVADO',
  'REJEITADO',
])

/** Nova revisão só na ponta da linha e com origem em status fechado. */
export function podeCriarNovaRevisaoOrcamento(orcamento: OrcamentoDto): boolean {
  return (
    ehUltimaRevisaoOrcamento(orcamento) &&
    STATUS_PERMITE_NOVA_REVISAO.has(orcamento.status)
  )
}
