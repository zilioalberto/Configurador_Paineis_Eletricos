import type { PerfilOferta, TipoBlocoOferta } from './orcamentos'

/** Callbacks para edição inline na prévia (somente no editor da oferta). */
export type PropostaClienteEdicao = Readonly<{
  podeEditar: boolean
  perfil: PerfilOferta
  titulo: string
  onTituloChange: (valor: string) => void
  onBlocoConteudoChange: (tipo: TipoBlocoOferta, conteudo: string) => void
}>
