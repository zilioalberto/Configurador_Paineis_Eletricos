import type {
  NfesEmitidasFiltros,
  NfesRecebidasFiltros,
  RelatorioNFeFiltros,
  SefazDistribuicaoFiltros,
} from './types/documentoFiscalRecebido'
import type { RelatorioFaturamentoFiltros } from './types/relatorioFaturamento'

/** Chaves React Query do módulo fiscal. */
export const fiscalQueryKeys = {
  all: ['fiscal'] as const,
  config: ['fiscal', 'config'] as const,
  itensFiscais: (search: string, page: number, pageSize: number) =>
    ['fiscal', 'itens-fiscais', search.trim(), page, pageSize] as const,
  produtoBuscaFiscal: (consulta: string) =>
    [...fiscalQueryKeys.all, 'produto-busca-fiscal', consulta.trim()] as const,
  nfesRecebidas: (filtros: NfesRecebidasFiltros, page: number, pageSize: number) =>
    ['fiscal', 'nfes-recebidas', filtros, page, pageSize] as const,
  sefazDistribuicao: (filtros: SefazDistribuicaoFiltros, page: number, pageSize: number) =>
    ['fiscal', 'sefaz-distribuicao', filtros, page, pageSize] as const,
  relatorioNfes: (filtros: RelatorioNFeFiltros) =>
    ['fiscal', 'relatorio-nfes', filtros] as const,
  nfeRecebida: (id: number) => ['fiscal', 'nfe-recebida', id] as const,
  nfePreviewCatalogo: (id: number) => ['fiscal', 'nfe-preview-catalogo', id] as const,
  nfseRecebida: (publicId: string) => ['fiscal', 'nfse-recebida', publicId] as const,
  nfeEmitida: (publicId: string) => ['fiscal', 'nfe-emitida', publicId] as const,
  controleNsu: (cnpj: string) => ['fiscal', 'controle-nsu', cnpj.replace(/\D/g, '')] as const,
  controleNsuNfseAdn: (cnpj: string) =>
    ['fiscal', 'controle-nsu-nfse-adn', cnpj.replace(/\D/g, '')] as const,
  nfseRecebidasAll: ['fiscal', 'nfse-recebidas'] as const,
  obrigacoesDashboard: ['fiscal', 'obrigacoes', 'dashboard'] as const,
  obrigacoesPacotes: ['fiscal', 'obrigacoes', 'pacotes'] as const,
  obrigacaoPacote: (publicId: string) => ['fiscal', 'obrigacoes', 'pacote', publicId] as const,
  nfesEmitidas: (
    filtros: NfesEmitidasFiltros,
    page: number,
    pageSize: number,
    ordering: string,
  ) => ['fiscal', 'nfes-emitidas', filtros, page, pageSize, ordering] as const,
  simplesPerfil: ['fiscal', 'simples', 'perfil'] as const,
  simplesFaturamento: (dataReferencia: string) =>
    ['fiscal', 'simples', 'faturamento', dataReferencia] as const,
  simplesProjecao: (competencia: string) =>
    ['fiscal', 'simples', 'projecao-das', competencia] as const,
  relatorioFaturamento: (filtros: RelatorioFaturamentoFiltros) =>
    ['fiscal', 'relatorio-faturamento', filtros] as const,
}
