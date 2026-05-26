import { useCallback, useEffect, useState } from 'react'

import { useToast } from '@/components/feedback'
import {
  CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES,
  labelMargemBitola,
  margemBitolaCondutoresOptions,
} from '../configuradorParametros'
import { atualizarParametroConfiguracao } from '../services/erpApi'
import type { ParametroConfiguracaoDto } from '../types/erp'

type Props = Readonly<{
  parametros: ParametroConfiguracaoDto[]
  podeGerenciar: boolean
  onAtualizado: (param: ParametroConfiguracaoDto) => void
}>

function parseDegraus(valor: string | null | undefined): number {
  const n = Number.parseInt(String(valor ?? '').trim(), 10)
  return n === 0 || n === 1 ? n : 1
}

export default function ConfiguradorPaineisConfigTab({
  parametros,
  podeGerenciar,
  onAtualizado,
}: Props) {
  const { showToast } = useToast()
  const paramMargem = parametros.find((p) => p.chave === CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES)
  const [degraus, setDegraus] = useState(() => parseDegraus(paramMargem?.valor))
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setDegraus(parseDegraus(paramMargem?.valor))
  }, [paramMargem?.valor])

  const guardarMargem = useCallback(async () => {
    if (!paramMargem || !podeGerenciar) return
    setSalvando(true)
    try {
      const atualizado = await atualizarParametroConfiguracao(CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES, {
        valor: String(degraus),
        descricao: paramMargem.descricao,
      })
      onAtualizado(atualizado)
      showToast({ variant: 'success', message: 'Parâmetro do configurador atualizado.' })
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível guardar a margem de bitola.',
      })
    } finally {
      setSalvando(false)
    }
  }, [degraus, onAtualizado, paramMargem, podeGerenciar, showToast])

  if (!paramMargem) {
    return (
      <p className="text-muted mb-0">
        Parâmetro <code>{CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES}</code> não encontrado. Execute as
        migrations do backend.
      </p>
    )
  }

  return (
    <div className="vstack gap-4">
      <section>
        <h2 className="h6 mb-2">Dimensionamento de condutores</h2>
        <p className="text-muted small mb-3">
          Aplica-se a todas as configurações de painel no dimensionamento sugerido (cargas e
          alimentação geral).
        </p>
        <div className="row g-3 align-items-end" style={{ maxWidth: '36rem' }}>
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="erp-margem-bitola">
              Margem de bitola (condutores)
            </label>
            <select
              id="erp-margem-bitola"
              className="form-select"
              value={degraus}
              onChange={(e) => setDegraus(Number(e.target.value))}
              disabled={!podeGerenciar || salvando}
            >
              {margemBitolaCondutoresOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="form-text small mb-0">
              0 = mínimo da tabela Iz; 1 = uma bitola comercial acima (ex.: 4 → 6 mm²).
            </p>
          </div>
          {podeGerenciar ? (
            <div className="col-12">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={salvando || degraus === parseDegraus(paramMargem.valor)}
                onClick={() => void guardarMargem()}
              >
                {salvando ? 'Guardando…' : 'Guardar margem de bitola'}
              </button>
            </div>
          ) : (
            <div className="col-12">
              <p className="small text-muted mb-0">
                Valor atual: <strong>{labelMargemBitola(parseDegraus(paramMargem.valor))}</strong>
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
