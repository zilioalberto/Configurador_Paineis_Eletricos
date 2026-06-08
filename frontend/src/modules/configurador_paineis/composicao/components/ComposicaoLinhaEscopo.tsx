import type { ReactNode } from 'react'
import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import type { ResumoDimensionamento } from '@/modules/configurador_paineis/dimensionamento/types/dimensionamento'
import type { CargaDetalhe, ProjetoAlimentacaoSnapshot } from '../types/composicao'
import { CelulaTensaoCarga } from './composicaoTableComponents'
import {
  em,
  formatCorrenteCarga,
  formatNumeroFasesCarga,
  formatPotenciaCarga,
  formatPotenciaPainelEntradaKw,
  LEGENDA_PAPEL_PAINEL_GERAL,
  LEGENDA_TAG_PAINEL_GERAL,
  LEGENDA_TIPO_PAINEL_GERAL,
  textoCorrenteEntradaPainel,
  textoDescricaoCarga,
  textoDescricaoItemPainelSemCarga,
  textoFasesAlimentacaoProjeto,
  textoPapelItem,
  textoTensaoAlimentacaoProjeto,
} from '../utils/composicaoDisplay'

export type LinhaItemComposicaoEscopo = {
  id: string
  carga: CargaDetalhe | null
  corrente_referencia_a?: string | null
  projeto_alimentacao?: ProjetoAlimentacaoSnapshot
  quantidade: string
  observacoes?: string | null
  categoria_produto: string
  categoria_produto_display?: string
  produto?: { codigo?: string; descricao?: string } | null
  produto_codigo?: string | null
  parte_painel?: string
  parte_painel_display?: string
}

type Props = {
  item: LinhaItemComposicaoEscopo
  dimensionamento: ResumoDimensionamento | undefined
  projeto: Projeto | undefined
  statusLabel: string
  acoes?: ReactNode
}

/** Linha única de item de composição (sugestão ou aprovado) com colunas de escopo. */
export function ComposicaoLinhaEscopo({
  item,
  dimensionamento,
  projeto,
  statusLabel,
  acoes,
}: Props) {
  const c = item.carga
  return (
    <tr>
      <td>{c ? c.tag : LEGENDA_TAG_PAINEL_GERAL}</td>
      <td>
        {c
          ? textoDescricaoCarga(c)
          : textoDescricaoItemPainelSemCarga(item.parte_painel, item.parte_painel_display)}
      </td>
      <td>
        {c ? (
          <span className="badge text-bg-secondary">{em(c.tipo_display)}</span>
        ) : (
          <span className="badge text-bg-secondary">{LEGENDA_TIPO_PAINEL_GERAL}</span>
        )}
      </td>
      <td>
        {c
          ? formatPotenciaCarga(c)
          : formatPotenciaPainelEntradaKw(
              dimensionamento,
              item.corrente_referencia_a,
              item.projeto_alimentacao,
              projeto
            )}
      </td>
      <td>
        {c
          ? formatCorrenteCarga(c)
          : textoCorrenteEntradaPainel(dimensionamento, item.corrente_referencia_a)}
      </td>
      {c ? (
        <CelulaTensaoCarga carga={c} />
      ) : (
        <td className="small">
          {textoTensaoAlimentacaoProjeto(item.projeto_alimentacao, projeto)}
        </td>
      )}
      <td>
        {c
          ? formatNumeroFasesCarga(c)
          : textoFasesAlimentacaoProjeto(item.projeto_alimentacao, projeto)}
      </td>
      <td className="small">
        {c ? em(textoPapelItem(item.observacoes)) : LEGENDA_PAPEL_PAINEL_GERAL}
      </td>
      <td>{item.quantidade}</td>
      <td>
        <span className="badge text-bg-secondary">
          {item.categoria_produto_display ?? item.categoria_produto}
        </span>
      </td>
      <td className="small">{item.produto?.descricao ?? '—'}</td>
      <td>
        <span className="fw-semibold font-monospace">
          {item.produto_codigo ?? item.produto?.codigo ?? '—'}
        </span>
      </td>
      <td>{statusLabel}</td>
      {acoes ?? null}
    </tr>
  )
}
