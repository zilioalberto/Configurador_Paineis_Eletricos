import type { SecaoPreview } from './propostaClienteUi'

/** Agrupa seções em páginas A4 estimadas para impressão com rodapé numerado. */
export function agruparSecoesEmPaginas(
  secoes: SecaoPreview[],
  pesoMaximo = 900
): SecaoPreview[][] {
  if (secoes.length === 0) return []

  const grupos: SecaoPreview[][] = []
  let grupo: SecaoPreview[] = []
  let peso = 0

  const pesoSecao = (s: SecaoPreview) => (s.titulo?.length ?? 0) * 4 + (s.conteudo?.length ?? 0)

  for (const secao of secoes) {
    const p = pesoSecao(secao)
    if (grupo.length > 0 && peso + p > pesoMaximo) {
      grupos.push(grupo)
      grupo = []
      peso = 0
    }
    grupo.push(secao)
    peso += p
  }
  if (grupo.length) grupos.push(grupo)
  return grupos
}

export function totalPaginasProposta(qtdPaginasConteudo: number, comApendiceLegal: boolean): number {
  // capa + conteúdo + investimento + aprovação (+ apêndice opcional em página própria)
  return 1 + qtdPaginasConteudo + 1 + 1 + (comApendiceLegal ? 1 : 0)
}
