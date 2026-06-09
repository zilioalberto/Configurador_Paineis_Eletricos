import type { ProjetoFluxoEtapaId } from './projetos/hooks/useProjetoFluxoGates'

function withProjeto(path: string, projetoId?: string | null): string {
  if (!projetoId) return path
  const qs = new URLSearchParams({ projeto: projetoId })
  return `${path}?${qs.toString()}`
}

function withProjetoEtapa(path: string, projetoId: string | null | undefined, etapa: string): string {
  const qs = new URLSearchParams()
  if (projetoId) qs.set('projeto', projetoId)
  qs.set('etapa', etapa)
  return `${path}?${qs.toString()}`
}

export const configuradorPaths = {
  configuracoes: '/configurador/configuracoes',
  novaConfiguracao: '/configurador/configuracoes/novo',
  configuracaoDetalhe: (id: string) => `/configurador/configuracoes/${encodeURIComponent(id)}`,
  configuracaoEditar: (id: string) => `/configurador/configuracoes/${encodeURIComponent(id)}/editar`,
  configuracaoFluxo: (id: string, etapa: ProjetoFluxoEtapaId) =>
    `/configurador/configuracoes/${encodeURIComponent(id)}/fluxo/${etapa}`,

  cargas: (projetoId?: string | null) => withProjeto('/configurador/cargas', projetoId),
  /** Listagem com drawer de edição aberto (mesmo layout da nova carga). */
  cargasEditar: (projetoId: string, cargaId: string) => {
    const qs = new URLSearchParams({ projeto: projetoId, editar: cargaId })
    return `/configurador/cargas?${qs.toString()}`
  },
  novaCarga: (projetoId?: string | null) => withProjeto('/configurador/cargas/novo', projetoId),
  cargaDetalhe: (id: string) => `/configurador/cargas/${encodeURIComponent(id)}`,
  /** Rota legada — redireciona para {@link cargasEditar}. */
  cargaEditar: (id: string) => `/configurador/cargas/${encodeURIComponent(id)}/editar`,
  modelosCargas: '/configurador/cargas/modelos',

  composicao: (projetoId?: string | null) => withProjeto('/configurador/composicao', projetoId),
  composicaoFinal: (projetoId?: string | null) =>
    withProjetoEtapa('/configurador/composicao', projetoId, 'composicao_final'),
  dimensionamento: (projetoId?: string | null) =>
    withProjeto('/configurador/dimensionamento', projetoId),
}
