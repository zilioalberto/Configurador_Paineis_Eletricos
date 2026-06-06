import { type DragEvent } from 'react'

import type { OrcamentoOfertaBlocoDto, TipoBlocoOferta } from '../types/orcamentos'
import {
  blocoEditavelNoDocumento,
  dicaSecaoOferta,
  estimarLinhasTextarea,
  rotuloTipoBlocoOferta,
  secaoOfertaComConteudo,
  tituloExibicaoBlocoOferta,
} from '../utils/ofertaBlocoUi'

type GrupoOrdemSecao = 'corpo' | 'apos' | 'condicoes'

type Props = Readonly<{
  bloco: OrcamentoOfertaBlocoDto
  podeEditar: boolean
  grupoOrdem?: GrupoOrdemSecao
  totalNoGrupo?: number
  arrastandoTipo: TipoBlocoOferta | null
  alvoArrasteTipo: TipoBlocoOferta | null
  onArrastarInicio: (tipo: TipoBlocoOferta) => void
  onArrastarFim: () => void
  onArrastarAlvo: (tipo: TipoBlocoOferta | null) => void
  onReordenar: (grupo: GrupoOrdemSecao, tipoArrastado: TipoBlocoOferta, tipoAlvo: TipoBlocoOferta) => void
  onAtualizarConteudo: (tipo: OrcamentoOfertaBlocoDto['tipo'], conteudo: string) => void
  onLimparSecao: (tipo: OrcamentoOfertaBlocoDto['tipo']) => void
}>

export default function OfertaSecaoCard({
  bloco,
  podeEditar,
  grupoOrdem,
  totalNoGrupo = 1,
  arrastandoTipo,
  alvoArrasteTipo,
  onArrastarInicio,
  onArrastarFim,
  onArrastarAlvo,
  onReordenar,
  onAtualizarConteudo,
  onLimparSecao,
}: Props) {
  const editavel = blocoEditavelNoDocumento(bloco, podeEditar)
  const incluida = secaoOfertaComConteudo(bloco)
  const podeArrastar = Boolean(podeEditar && grupoOrdem && totalNoGrupo > 1)
  const ehAlvo = alvoArrasteTipo === bloco.tipo && arrastandoTipo !== bloco.tipo

  return (
    <section
      id={`orc-oferta-secao-${bloco.tipo}`}
      className={[
        'orcamento-oferta-secao-card',
        incluida ? '' : ' orcamento-oferta-secao-card--oculta',
        podeArrastar ? ' orcamento-oferta-secao-card--arrastavel' : '',
        ehAlvo ? ' orcamento-oferta-secao-card--arraste-alvo' : '',
        arrastandoTipo === bloco.tipo ? ' orcamento-oferta-secao-card--arrastando' : '',
      ].join('')}
      draggable={podeArrastar}
      onDragStart={(e: DragEvent<HTMLElement>) => {
        if (!podeArrastar) return
        onArrastarInicio(bloco.tipo)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', bloco.tipo)
      }}
      onDragEnd={onArrastarFim}
      onDragOver={(e: DragEvent<HTMLElement>) => {
        if (!podeArrastar || !arrastandoTipo || arrastandoTipo === bloco.tipo) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onArrastarAlvo(bloco.tipo)
      }}
      onDragLeave={() => {
        if (alvoArrasteTipo === bloco.tipo) onArrastarAlvo(null)
      }}
      onDrop={(e: DragEvent<HTMLElement>) => {
        e.preventDefault()
        if (!grupoOrdem || !arrastandoTipo || arrastandoTipo === bloco.tipo) return
        onReordenar(grupoOrdem, arrastandoTipo, bloco.tipo)
        onArrastarFim()
      }}
    >
      <div className="orcamento-oferta-secao-card__head">
        {podeArrastar ? (
          <span
            className="orcamento-oferta-secao-card__arraste"
            title="Arrastar para reordenar na proposta ao cliente"
            aria-hidden
          >
            ⠿
          </span>
        ) : null}
        <h3 className="orcamento-oferta-secao-card__titulo">{tituloExibicaoBlocoOferta(bloco)}</h3>
        {incluida && editavel ? (
          <button
            type="button"
            className="btn btn-sm btn-link text-danger p-0"
            onClick={() => onLimparSecao(bloco.tipo)}
          >
            Retirar da proposta
          </button>
        ) : null}
        {incluida ? null : (
          <span className="orcamento-oferta-secao-card__badge">Não incluída</span>
        )}
      </div>
      <p className="orcamento-oferta-secao-card__dica">{dicaSecaoOferta(bloco.tipo)}</p>
      <textarea
        className="orcamento-oferta-secao-card__textarea"
        value={bloco.conteudo || ''}
        onChange={(e) => onAtualizarConteudo(bloco.tipo, e.target.value)}
        disabled={!editavel}
        rows={estimarLinhasTextarea(bloco.conteudo || '', 3, 14)}
        aria-label={bloco.titulo || rotuloTipoBlocoOferta(bloco.tipo)}
        placeholder="Parágrafos separados por linha em branco. Use «- » para listas."
      />
    </section>
  )
}
