import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import type {
  OrcamentoConfiguradorPainelDto,
  OrcamentoPreviewOfertaItemDto,
  PerfilOferta,
} from '../types/orcamentos'
import {
  INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO,
  descricaoInvestimentoConsolidadaPadrao,
  descricaoInvestimentoExibicao,
} from './investimentoDescricao'
import { normalizarNcmInvestimento } from './ncmInvestimento'
import { parseDecimalPt } from './orcamentoUi'

function refPainel(painel: OrcamentoConfiguradorPainelDto): string {
  return `P${painel.ordem + 1}`
}

function decimalStr(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const arred = Math.round(n * 100) / 100
  return String(arred)
}

function subtotalLinha(linha: LinhaEditavelOrcamento): number {
  const qtd = parseDecimalPt(linha.quantidade || '0')
  const preco = parseDecimalPt(linha.preco_unitario || '0')
  if (!Number.isFinite(qtd) || !Number.isFinite(preco)) return 0
  return qtd * preco
}

function linhaInvestimento(
  descricao: string,
  subtotal: number,
  ncm: string
): OrcamentoPreviewOfertaItemDto {
  const valor = decimalStr(subtotal)
  return {
    descricao,
    quantidade: '1',
    preco_unitario: valor,
    subtotal: valor,
    unidade: 'un',
    ncm,
  }
}

function investimentoPorPainel(
  linhas: LinhaEditavelOrcamento[],
  paineis: OrcamentoConfiguradorPainelDto[],
  ncm: string,
  investimentoDescricao?: string
): OrcamentoPreviewOfertaItemDto[] | null {
  const ativos = [...paineis]
    .filter((p) => p.modo === 'ATIVO')
    .sort((a, b) => a.ordem - b.ordem)
  if (!ativos.length) return null

  const itens: OrcamentoPreviewOfertaItemDto[] = []
  const usados = new Set<number>()

  for (const painel of ativos) {
    const ref = refPainel(painel)
    const grupo = linhas.filter((linha, idx) => {
      if (!ref || !linha.painelRef) return false
      if (linha.painelRef === ref) {
        usados.add(idx)
        return true
      }
      return false
    })
    if (!grupo.length) continue
    const sub = grupo.reduce((s, l) => s + subtotalLinha(l), 0)
    itens.push(linhaInvestimento(painel.descricao_painel.trim() || 'Painel', sub, ncm))
  }

  const semPainel = linhas.filter((_, idx) => !usados.has(idx))
  if (semPainel.length) {
    const sub = semPainel.reduce((s, l) => s + subtotalLinha(l), 0)
    itens.push(
      linhaInvestimento(
        descricaoInvestimentoExibicao(
          investimentoDescricao,
          INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO
        ),
        sub,
        ncm
      )
    )
  }

  return itens.length ? itens : null
}

export function montarItensInvestimentoLocal(params: {
  perfil: PerfilOferta
  titulo: string
  linhas: LinhaEditavelOrcamento[]
  paineis?: OrcamentoConfiguradorPainelDto[]
  ncmInvestimento?: string
  investimentoDescricao?: string
}): {
  modo: 'ITENS_UNITARIOS' | 'CONSOLIDADO' | 'POR_PAINEL'
  itens: OrcamentoPreviewOfertaItemDto[]
} {
  const { perfil, titulo, linhas, paineis = [], ncmInvestimento, investimentoDescricao } =
    params

  if (perfil === 'SOLUCAO_COMPLETA') {
    const ncm = normalizarNcmInvestimento(ncmInvestimento)
    const porPainel = investimentoPorPainel(linhas, paineis, ncm, investimentoDescricao)
    if (porPainel) {
      return { modo: 'POR_PAINEL', itens: porPainel }
    }
    const total = linhas.reduce((s, l) => s + subtotalLinha(l), 0)
    return {
      modo: 'CONSOLIDADO',
      itens: [
        linhaInvestimento(
          descricaoInvestimentoExibicao(
            investimentoDescricao,
            descricaoInvestimentoConsolidadaPadrao(titulo)
          ),
          total,
          ncm
        ),
      ],
    }
  }

  return {
    modo: 'ITENS_UNITARIOS',
    itens: linhas.map((linha, index) => ({
      id: linha.id || `linha-${index}`,
      codigo: linha.produtoCodigo || linha.servicoCodigo || '',
      descricao: linha.descricao || '—',
      quantidade: linha.quantidade || '0',
      preco_unitario: linha.preco_unitario || '0',
      subtotal: decimalStr(subtotalLinha(linha)),
      unidade: linha.servicoUnidadeMedida?.trim() || 'un',
      ncm: linha.tipo === 'PRODUTO' ? linha.produtoNcm?.trim() || '' : '',
    })),
  }
}
