/**
 * Renderização de conteúdo da oferta (parágrafos, listas e negrito **texto**).
 * Espelha as regras do backend (oferta_texto.py).
 */
import { Fragment, type ReactNode } from 'react'

import { formatarDescricaoItemOferta } from './ofertaFormatacao'

type BlocoSegmento =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; items: string[] }

function segmentarConteudo(conteudo: string): BlocoSegmento[] {
  const texto = (conteudo || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!texto.trim()) {
    return [{ kind: 'paragraph', lines: ['—'] }]
  }

  const blocos: BlocoSegmento[] = []
  let paragrafoAtual: string[] = []
  let listaAtual: string[] = []

  const flushParagrafo = () => {
    if (paragrafoAtual.length) {
      blocos.push({ kind: 'paragraph', lines: [...paragrafoAtual] })
      paragrafoAtual = []
    }
  }
  const flushLista = () => {
    if (listaAtual.length) {
      blocos.push({ kind: 'list', items: [...listaAtual] })
      listaAtual = []
    }
  }

  for (const linha of texto.split('\n')) {
    const limpa = linha.trim()
    if (!limpa) {
      flushLista()
      flushParagrafo()
      continue
    }
    if (limpa.startsWith('- ')) {
      flushParagrafo()
      listaAtual.push(formatarDescricaoItemOferta(limpa.slice(2).trim()))
      continue
    }
    flushLista()
    paragrafoAtual.push(limpa)
  }
  flushLista()
  flushParagrafo()
  return blocos.length ? blocos : [{ kind: 'paragraph', lines: ['—'] }]
}

function renderInlineComNegrito(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g)
  return partes.map((parte, index) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return <strong key={index}>{parte.slice(2, -2)}</strong>
    }
    return <Fragment key={index}>{parte}</Fragment>
  })
}

type Props = Readonly<{
  conteudo: string
  className?: string
}>

export default function OfertaConteudoFormatado({ conteudo, className }: Props) {
  const blocos = segmentarConteudo(conteudo)

  return (
    <div className={className ?? 'oferta-conteudo-formatado'}>
      {blocos.map((bloco, index) => {
        if (bloco.kind === 'list') {
          return (
            <ul key={index} className="oferta-conteudo-formatado__lista">
              {bloco.items.map((item, i) => (
                <li key={i}>{renderInlineComNegrito(item)}</li>
              ))}
            </ul>
          )
        }
        const textoParagrafo = bloco.lines.join('\n')
        return (
          <p key={index} className="oferta-conteudo-formatado__paragrafo">
            {renderInlineComNegrito(textoParagrafo)}
          </p>
        )
      })}
    </div>
  )
}
