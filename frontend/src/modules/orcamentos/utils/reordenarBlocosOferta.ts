import type { OrcamentoOfertaBlocoDto, PerfilOferta, TipoBlocoOferta } from '../types/orcamentos'

import { mesclarBlocosTemplateEditor, secoesTemplateParaPerfil } from './ofertaBlocoUi'

/** Reordena tipos dentro de um grupo (arrastar sobre outro card do mesmo grupo). */
export function reordenarTiposNoGrupo(
  tiposAtual: readonly TipoBlocoOferta[],
  tipoArrastado: TipoBlocoOferta,
  tipoAlvo: TipoBlocoOferta
): TipoBlocoOferta[] {
  const from = tiposAtual.indexOf(tipoArrastado)
  const to = tiposAtual.indexOf(tipoAlvo)
  if (from < 0 || to < 0 || from === to) return [...tiposAtual]
  const next = [...tiposAtual]
  next.splice(from, 1)
  next.splice(to, 0, tipoArrastado)
  return next
}

/** Sequência completa de blocos textuais no editor (investimento não entra). */
export function sequenciaTiposEditorVisual(
  perfil: PerfilOferta,
  ordemCorpo: readonly TipoBlocoOferta[],
  ordemApos: readonly TipoBlocoOferta[],
  ordemCondicoes: readonly TipoBlocoOferta[]
): TipoBlocoOferta[] {
  const seq: TipoBlocoOferta[] = ['INTRODUCAO']
  for (const tipo of ordemCorpo) {
    if (tipo !== 'INTRODUCAO') seq.push(tipo)
  }
  seq.push(...ordemApos, ...ordemCondicoes)
  const vistos = new Set<TipoBlocoOferta>()
  return seq.filter((tipo) => {
    if (vistos.has(tipo)) return false
    vistos.add(tipo)
    return secoesTemplateParaPerfil(perfil).includes(tipo)
  })
}

/** Aplica `ordem` conforme a sequência visual (persistida ao salvar). */
export function aplicarSequenciaOrdemBlocos(
  blocos: OrcamentoOfertaBlocoDto[],
  perfil: PerfilOferta,
  sequencia: readonly TipoBlocoOferta[]
): OrcamentoOfertaBlocoDto[] {
  const mesclados = mesclarBlocosTemplateEditor(blocos, perfil)
  const porTipo = new Map(mesclados.map((b) => [b.tipo, b]))
  const atualizados = new Map<TipoBlocoOferta, OrcamentoOfertaBlocoDto>()

  sequencia.forEach((tipo, ordem) => {
    const bloco = porTipo.get(tipo)
    if (bloco) atualizados.set(tipo, { ...bloco, ordem })
  })

  let ordemExtra = sequencia.length
  for (const bloco of mesclados) {
    if (!atualizados.has(bloco.tipo)) {
      atualizados.set(bloco.tipo, { ...bloco, ordem: ordemExtra++ })
    }
  }

  return [...atualizados.values()].sort((a, b) => a.ordem - b.ordem)
}
