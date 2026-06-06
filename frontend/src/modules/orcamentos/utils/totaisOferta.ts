import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import type { OrcamentoPreviewTotaisDto } from '../types/orcamentos'
import { parseDecimalPt } from './orcamentoUi'

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

export type ParametrosResumoOferta = Readonly<{
  linhas: LinhaEditavelOrcamento[]
  descontoComercialAtivo: boolean
  descontoPercentual: string
}>

/** Espelha `calcular_resumo_financeiro_oferta` no backend. */
export function calcularResumoFinanceiroOferta(
  params: ParametrosResumoOferta
): OrcamentoPreviewTotaisDto {
  const linhas = params.linhas
  let produtos = 0
  let servicos = 0
  let subtotal = 0

  for (const linha of linhas) {
    const sub = subtotalLinha(linha)
    subtotal += sub
    if (linha.tipo === 'SERVICO') servicos += sub
    else produtos += sub
  }

  subtotal = Math.round(subtotal * 100) / 100
  produtos = Math.round(produtos * 100) / 100
  servicos = Math.round(servicos * 100) / 100

  const descontoPct = params.descontoComercialAtivo
    ? parseDecimalPt(params.descontoPercentual || '0')
    : 0
  const aplicarDetalhe =
    params.descontoComercialAtivo && descontoPct > 0 && subtotal > 0

  let descontoValor = 0
  let total = subtotal

  if (aplicarDetalhe) {
    descontoValor = Math.round(subtotal * (descontoPct / 100) * 100) / 100
    total = Math.round((subtotal - descontoValor) * 100) / 100
  }

  return {
    produtos: decimalStr(produtos),
    servicos: decimalStr(servicos),
    subtotal: decimalStr(subtotal),
    desconto_ativo: aplicarDetalhe,
    desconto_percentual: decimalStr(descontoPct),
    desconto_valor: decimalStr(descontoValor),
    impostos_percentual: '0',
    impostos_valor: '0',
    total: decimalStr(total),
  }
}
