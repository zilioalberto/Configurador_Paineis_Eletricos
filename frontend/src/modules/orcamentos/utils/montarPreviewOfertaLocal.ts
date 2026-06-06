import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'

import type {

  OrcamentoConfiguradorPainelDto,

  OrcamentoOfertaBlocoDto,

  OrcamentoPreviewOfertaDto,

  PerfilOferta,

} from '../types/orcamentos'

import { formatarConteudoListaOferta } from './ofertaFormatacao'

import { montarItensInvestimentoLocal } from './investimentoOferta'

import { formatarNomeEmpresaExibicao, numeroPropostaExibicao } from './propostaClienteUi'

import { TIPOS_BLOCO_EXCLUIDOS_EDITOR } from './ofertaBlocoUi'

import { calcularResumoFinanceiroOferta } from './totaisOferta'



export type ContextoPreviewOfertaLocal = Readonly<{

  codigo: string

  codigo_base?: string

  revisao?: string

  titulo: string

  perfil_oferta: PerfilOferta

  validade: string | null

  emissao?: string | null

  desconto_comercial_ativo?: boolean

  desconto_percentual?: string

  ncm_investimento?: string

  investimento_descricao?: string

  configuradores_painel?: OrcamentoConfiguradorPainelDto[]

  cliente: {

    nome: string

    contato: string

    email: string

    telefone: string

    endereco?: string

    cnpj?: string

  }

  blocos: OrcamentoOfertaBlocoDto[]

  linhasItens: LinhaEditavelOrcamento[]

}>



/** Prévia da oferta a partir do estado do formulário (sem chamar a API). */

export function montarPreviewOfertaLocal(ctx: ContextoPreviewOfertaLocal): OrcamentoPreviewOfertaDto {

  const linhas = ctx.linhasItens

  const totais = calcularResumoFinanceiroOferta({

    linhas,

    descontoComercialAtivo: ctx.desconto_comercial_ativo === true,

    descontoPercentual: ctx.desconto_percentual ?? '0',

  })



  const secoes = [...ctx.blocos]

    .filter((b) => !TIPOS_BLOCO_EXCLUIDOS_EDITOR.has(b.tipo))

    .sort((a, b) => a.ordem - b.ordem)

    .map((b) => ({

      tipo: b.tipo,

      titulo: b.titulo,

      conteudo:

        b.tipo === 'ITENS_FORNECIMENTO' || b.tipo === 'SERVICOS'

          ? formatarConteudoListaOferta(b.conteudo)

          : b.conteudo,

    }))



  const investimentoBloco = montarItensInvestimentoLocal({

    perfil: ctx.perfil_oferta,

    titulo: ctx.titulo,

    linhas,

    paineis: ctx.configuradores_painel,

    ncmInvestimento: ctx.ncm_investimento,

    investimentoDescricao: ctx.investimento_descricao,

  })



  return {

    codigo: ctx.codigo,

    codigo_base:

      ctx.codigo_base?.trim() ||

      numeroPropostaExibicao(ctx.codigo, ctx.revisao),

    revisao: ctx.revisao,

    titulo: ctx.titulo,

    perfil_oferta: ctx.perfil_oferta,

    emissao: ctx.emissao ?? new Date().toISOString().slice(0, 10),

    cliente: {

      id: null,

      nome: formatarNomeEmpresaExibicao(ctx.cliente.nome),

      contato: ctx.cliente.contato,

      email: ctx.cliente.email,

      telefone: ctx.cliente.telefone,

      endereco: ctx.cliente.endereco ?? '',

      cnpj: ctx.cliente.cnpj ?? '',

    },

    validade: ctx.validade,

    secoes,

    investimento: {

      modo: investimentoBloco.modo,

      titulo: 'Investimento',

      itens: investimentoBloco.itens,

    },

    totais,

  }

}

