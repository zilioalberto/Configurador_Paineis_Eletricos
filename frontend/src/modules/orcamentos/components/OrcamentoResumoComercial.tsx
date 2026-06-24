import type { ReactNode } from 'react'

import type { OrcamentoPreviewTotaisDto } from '../types/orcamentos'
import { formatarPercentualExibicao } from '../utils/orcamentoUi'

import ResumoFinanceiroOferta from './ResumoFinanceiroOferta'

import './ResumoFinanceiroOferta.css'

type Props = Readonly<{
  podeEditar: boolean
  podeConfigurarDesconto: boolean
  descontoAtivo: boolean
  descontoPercentual: string
  totais: OrcamentoPreviewTotaisDto
  onDescontoAtivoChange: (ativo: boolean) => void
  onDescontoPercentualChange: (valor: string) => void
}>

export default function OrcamentoResumoComercial({
  podeEditar,
  podeConfigurarDesconto,
  descontoAtivo,
  descontoPercentual,
  totais,
  onDescontoAtivoChange,
  onDescontoPercentualChange,
}: Props) {
  const controlesDesconto = podeEditar && podeConfigurarDesconto

  let avisoDescontoSomenteLeitura: ReactNode = null
  if (!controlesDesconto && descontoAtivo) {
    avisoDescontoSomenteLeitura = (
      <p className="text-muted small mb-2">
        Desconto comercial aplicado ({formatarPercentualExibicao(descontoPercentual)}%). Você não
        tem permissão para alterar este valor.
      </p>
    )
  }

  return (
    <div className="orcamento-doc__resumo-comercial" aria-label="Resumo comercial da proposta">
      {controlesDesconto ? (
        <>
          <label className="orcamento-doc__resumo-comercial-toggle">
            <input
              type="checkbox"
              checked={descontoAtivo}
              onChange={(e) => onDescontoAtivoChange(e.target.checked)}
            />{' '}
            Aplicar desconto comercial na oferta ao cliente
          </label>

          {descontoAtivo ? (
            <div className="orcamento-doc__resumo-comercial-campos">
              <div>
                <label htmlFor="orc-desconto-percentual">Desconto (%)</label>
                <input
                  id="orc-desconto-percentual"
                  type="text"
                  inputMode="decimal"
                  className="form-control form-control-sm"
                  value={descontoPercentual}
                  onChange={(e) => onDescontoPercentualChange(e.target.value)}
                  placeholder="Ex.: 5"
                />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        avisoDescontoSomenteLeitura
      )}

      <ResumoFinanceiroOferta totais={totais} />
    </div>
  )
}
