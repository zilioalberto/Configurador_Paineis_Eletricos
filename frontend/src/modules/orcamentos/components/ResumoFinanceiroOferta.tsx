import type { OrcamentoPreviewTotaisDto } from '../types/orcamentos'
import {
  formatarPercentualExibicao,
  parseDecimalPt,
  valorMonetarioTabela,
} from '../utils/orcamentoUi'

function valorMonetario(valor: string): string {
  const n = parseDecimalPt(valor)
  if (!Number.isFinite(n)) return '—'
  return valorMonetarioTabela(n)
}

import './ResumoFinanceiroOferta.css'

type Props = Readonly<{
  totais: OrcamentoPreviewTotaisDto
  className?: string
}>

export default function ResumoFinanceiroOferta({ totais, className }: Props) {
  const rootClass = ['resumo-financeiro-oferta', className].filter(Boolean).join(' ')

  if (totais.desconto_ativo) {
    const pctDesconto = formatarPercentualExibicao(totais.desconto_percentual)
    return (
      <div className={rootClass} aria-label="Resumo financeiro">
        <div className="resumo-financeiro-oferta__linha">
          <span>Subtotal</span>
          <strong>R$ {valorMonetario(totais.subtotal)}</strong>
        </div>
        <div className="resumo-financeiro-oferta__linha resumo-financeiro-oferta__linha--detalhe">
          <span>Desconto ({pctDesconto}%)</span>
          <strong>− R$ {valorMonetario(totais.desconto_valor)}</strong>
        </div>
        <div className="resumo-financeiro-oferta__linha resumo-financeiro-oferta__linha--total">
          <span>Total geral</span>
          <strong>R$ {valorMonetario(totais.total)}</strong>
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass} aria-label="Resumo financeiro">
      <div className="resumo-financeiro-oferta__linha resumo-financeiro-oferta__linha--total">
        <span>Total geral</span>
        <strong>R$ {valorMonetario(totais.total)}</strong>
      </div>
    </div>
  )
}
