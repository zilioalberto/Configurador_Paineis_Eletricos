import type { ProjetoFluxoEtapaId } from './projetos/hooks/useProjetoFluxoGates'

function withProjeto(path: string, projetoId?: string | null): string {
  if (!projetoId) return path
  const qs = new URLSearchParams({ projeto: projetoId })
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
  novaCarga: (projetoId?: string | null) => withProjeto('/configurador/cargas/novo', projetoId),
  cargaDetalhe: (id: string) => `/configurador/cargas/${encodeURIComponent(id)}`,
  cargaEditar: (id: string) => `/configurador/cargas/${encodeURIComponent(id)}/editar`,
  modelosCargas: '/configurador/cargas/modelos',

  composicao: (projetoId?: string | null) => withProjeto('/configurador/composicao', projetoId),
  dimensionamento: (projetoId?: string | null) =>
    withProjeto('/configurador/dimensionamento', projetoId),
}
