import type { CargaDetalhe } from '../types/composicao'
import {
  em,
  formatCorrenteCarga,
  formatNumeroFasesCarga,
  formatPotenciaCarga,
  textoDescricaoCarga,
} from '../utils/composicaoDisplay'

export function CelulaTensaoCarga({ carga }: { carga: CargaDetalhe | null | undefined }) {
  const label =
    carga?.tensao_carga_display?.trim() ||
    (carga?.tensao_carga_v != null ? `${carga.tensao_carga_v} V` : '')
  if (!label) return <td>—</td>
  return <td className="small">{label}</td>
}

/** Linha de agrupamento no topo de cada bloco de tag (tabela única). */
export function LinhaSeparadoraGrupoPorTag({
  colSpan,
  tituloTag,
  carga,
}: {
  colSpan: number
  tituloTag: string
  carga: CargaDetalhe | null
}) {
  const tensao =
    carga?.tensao_carga_display?.trim() ||
    (carga?.tensao_carga_v != null ? `${carga.tensao_carga_v} V` : '—')
  return (
    <tr className="table-secondary">
      <td colSpan={colSpan} className="py-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="badge text-bg-primary rounded-pill">{tituloTag}</span>
          {carga ? (
            <>
              <span className="badge text-bg-secondary">{em(carga.tipo_display)}</span>
              <span className="fw-semibold">{textoDescricaoCarga(carga)}</span>
              <span className="small text-muted ms-lg-auto d-flex flex-wrap gap-3">
                <span>Pot.: {formatPotenciaCarga(carga)}</span>
                <span>Corr.: {formatCorrenteCarga(carga)}</span>
                <span>Tensão (carga): {tensao}</span>
                <span>Fases: {formatNumeroFasesCarga(carga)}</span>
              </span>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

export function CabecalhoGrupoCarga({
  tituloTag,
  carga,
}: {
  tituloTag: string
  carga: CargaDetalhe | null
}) {
  if (!carga) {
    return (
      <div className="d-flex flex-wrap align-items-center gap-2 py-2 px-3 bg-body-secondary border-bottom">
        <span className="badge text-bg-secondary rounded-pill">{tituloTag}</span>
      </div>
    )
  }
  const tensao =
    carga.tensao_carga_display?.trim() ||
    (carga.tensao_carga_v != null ? `${carga.tensao_carga_v} V` : '—')
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 py-2 px-3 bg-body-secondary border-bottom">
      <span className="badge text-bg-primary rounded-pill">{tituloTag}</span>
      <span className="badge text-bg-secondary">{em(carga.tipo_display)}</span>
      <span className="fw-medium">{textoDescricaoCarga(carga)}</span>
      <div className="small text-muted ms-lg-auto d-flex flex-wrap gap-x-3 gap-y-1">
        <span>Pot.: {formatPotenciaCarga(carga)}</span>
        <span>Corr.: {formatCorrenteCarga(carga)}</span>
        <span>Tensão (carga): {tensao}</span>
        <span>Fases: {formatNumeroFasesCarga(carga)}</span>
      </div>
    </div>
  )
}
