import type { OrcamentoOfertaBlocoDto, PerfilOferta, TipoBlocoOferta } from '../types/orcamentos'

import {
  normalizarBlocosOfertaTemplate,
  rotuloTipoBlocoOferta,
  secoesTemplateParaPerfil,
  tituloPadraoTipoBloco,
  TIPOS_BLOCO_EXCLUIDOS_EDITOR,
} from './ofertaBlocoUi'

export type SecaoDocumentoOferta = {
  titulo: string
  conteudo: string
}

/** Extrai título de linha `## Título` (1 a 3 `#`) sem regex (evita ReDoS). */
function extrairTituloHeadingHash(linha: string): string | null {
  let hashes = 0
  while (hashes < linha.length && hashes < 3 && linha.charAt(hashes) === '#') {
    hashes += 1
  }
  if (hashes < 1 || hashes > 3) return null

  let espacos = hashes
  while (espacos < linha.length && (linha.charAt(espacos) === ' ' || linha.charAt(espacos) === '\t')) {
    espacos += 1
  }
  if (espacos === hashes) return null

  const titulo = linha.slice(espacos).trim()
  return titulo || null
}

/** Extrai título de linha `1. Título` sem regex (evita ReDoS). */
function extrairTituloListaNumerada(linha: string): string | null {
  let digitos = 0
  while (digitos < linha.length) {
    const caractere = linha.charAt(digitos)
    if (caractere < '0' || caractere > '9') break
    digitos += 1
  }
  if (digitos < 1) return null
  if (digitos + 1 >= linha.length || linha.charAt(digitos) !== '.' || linha.charAt(digitos + 1) !== ' ') {
    return null
  }

  const titulo = linha.slice(digitos + 2).trim()
  return titulo || null
}

/** Extrai título de linha `## Título` ou `1. Título` sem regex (evita ReDoS). */
function extrairTituloHeadingLinha(linha: string): string | null {
  if (!linha) return null
  if (linha.startsWith('#')) {
    return extrairTituloHeadingHash(linha)
  }
  return extrairTituloListaNumerada(linha)
}

function normalizarChaveTitulo(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

function montarMapaTituloParaTipo(): Map<string, TipoBlocoOferta> {
  const mapa = new Map<string, TipoBlocoOferta>()
  const tipos = Object.keys(rotuloTipoBlocoOferta) as TipoBlocoOferta[]
  for (const tipo of tipos) {
    if (TIPOS_BLOCO_EXCLUIDOS_EDITOR.has(tipo)) continue
    mapa.set(normalizarChaveTitulo(tipo), tipo)
    mapa.set(normalizarChaveTitulo(rotuloTipoBlocoOferta(tipo)), tipo)
    mapa.set(normalizarChaveTitulo(tituloPadraoTipoBloco(tipo)), tipo)
  }
  const aliases: Record<string, TipoBlocoOferta> = {
    introducao: 'INTRODUCAO',
    intro: 'INTRODUCAO',
    apresentacao: 'INTRODUCAO',
    apresentação: 'INTRODUCAO',
    escopo: 'ESCOPO',
    'escopo de fornecimento': 'ESCOPO',
    itens: 'ITENS_FORNECIMENTO',
    'itens considerados': 'ITENS_FORNECIMENTO',
    servicos: 'SERVICOS',
    'servicos considerados': 'SERVICOS',
    exclusoes: 'EXCLUSOES',
    prazo: 'PRAZO_ENTREGA',
    'prazo de entrega': 'PRAZO_ENTREGA',
    pagamento: 'CONDICOES_PAGAMENTO',
    'condicoes de pagamento': 'CONDICOES_PAGAMENTO',
    'condicoes gerais': 'CONDICOES_GERAIS',
    garantia: 'GARANTIA',
    observacoes: 'OBSERVACOES',
    observacao: 'OBSERVACOES',
  }
  for (const [chave, tipo] of Object.entries(aliases)) {
    mapa.set(normalizarChaveTitulo(chave), tipo)
  }
  return mapa
}

const TITULO_PARA_TIPO = montarMapaTituloParaTipo()

export function tipoBlocoPorTituloSecao(titulo: string): TipoBlocoOferta | null {
  const chave = normalizarChaveTitulo(titulo)
  return TITULO_PARA_TIPO.get(chave) ?? null
}

/** Extrai seções a partir de títulos `## Título` ou `1. Título`. */
export function extrairSecoesDocumento(texto: string): SecaoDocumentoOferta[] {
  const normalizado = String(texto || '').replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  if (!normalizado.trim()) return []

  const secoes: SecaoDocumentoOferta[] = []
  let tituloAtual: string | null = null
  let linhasConteudo: string[] = []
  const preambulo: string[] = []

  const flush = () => {
    if (tituloAtual === null) return
    secoes.push({
      titulo: tituloAtual,
      conteudo: linhasConteudo.join('\n').trim(),
    })
    tituloAtual = null
    linhasConteudo = []
  }

  for (const linha of normalizado.split('\n')) {
    const tituloHeading = extrairTituloHeadingLinha(linha)
    if (tituloHeading) {
      flush()
      tituloAtual = tituloHeading
      continue
    }
    if (tituloAtual === null) {
      preambulo.push(linha)
    } else {
      linhasConteudo.push(linha)
    }
  }
  flush()

  const textoPreambulo = preambulo.join('\n').trim()
  if (!secoes.length && textoPreambulo) {
    return [{ titulo: tituloPadraoTipoBloco('INTRODUCAO'), conteudo: textoPreambulo }]
  }
  if (textoPreambulo && secoes.length) {
    secoes[0] = {
      ...secoes[0],
      conteudo: [textoPreambulo, secoes[0].conteudo].filter(Boolean).join('\n\n'),
    }
  }
  return secoes
}

export function blocosParaDocumento(blocos: OrcamentoOfertaBlocoDto[]): string {
  const partes: string[] = []
  const ordenados = [...blocos]
    .filter((b) => !TIPOS_BLOCO_EXCLUIDOS_EDITOR.has(b.tipo))
    .sort((a, b) => a.ordem - b.ordem)

  for (const bloco of ordenados) {
    const conteudo = (bloco.conteudo || '').trim()
    if (!conteudo) continue
    const titulo = (bloco.titulo || '').trim() || tituloPadraoTipoBloco(bloco.tipo)
    partes.push(`## ${titulo}\n\n${conteudo}`)
  }
  return partes.join('\n\n')
}

type ConteudoSecaoParseado = { titulo: string; conteudo: string }

/** Interpreta markdown em mapa por tipo de bloco + anexos em Observações. */
function parseDocumentoParaMapa(
  texto: string,
  blocosExistentes: OrcamentoOfertaBlocoDto[]
): {
  porTipo: Map<TipoBlocoOferta, ConteudoSecaoParseado>
  extrasObservacoes: string
} {
  const metadados = new Map<TipoBlocoOferta, OrcamentoOfertaBlocoDto>()
  for (const bloco of blocosExistentes) {
    if (!TIPOS_BLOCO_EXCLUIDOS_EDITOR.has(bloco.tipo) && !metadados.has(bloco.tipo)) {
      metadados.set(bloco.tipo, bloco)
    }
  }

  const porTipo = new Map<TipoBlocoOferta, ConteudoSecaoParseado>()
  const extras: string[] = []
  const secoes = extrairSecoesDocumento(texto)

  const mergeTipo = (tipo: TipoBlocoOferta, titulo: string, conteudo: string) => {
    const atual = porTipo.get(tipo)
    if (atual) {
      porTipo.set(tipo, {
        titulo: atual.titulo || titulo,
        conteudo: `${atual.conteudo}\n\n${conteudo}`.trim(),
      })
    } else {
      porTipo.set(tipo, {
        titulo: titulo.trim() || tituloPadraoTipoBloco(tipo),
        conteudo,
      })
    }
  }

  for (const secao of secoes) {
    const conteudo = (secao.conteudo || '').trim()
    if (!conteudo) continue
    const tipo = tipoBlocoPorTituloSecao(secao.titulo)
    if (tipo) {
      mergeTipo(tipo, secao.titulo, conteudo)
      continue
    }
    extras.push(`## ${secao.titulo}\n\n${conteudo}`)
  }

  const extrasObservacoes = extras.join('\n\n')
  if (extrasObservacoes) {
    const baseObs = metadados.get('OBSERVACOES')
    const obsExistente = porTipo.get('OBSERVACOES')
    const tituloObs =
      obsExistente?.titulo?.trim() ||
      baseObs?.titulo?.trim() ||
      tituloPadraoTipoBloco('OBSERVACOES')
    const conteudoObs = [obsExistente?.conteudo, extrasObservacoes].filter(Boolean).join('\n\n')
    porTipo.set('OBSERVACOES', { titulo: tituloObs, conteudo: conteudoObs })
  }

  return { porTipo, extrasObservacoes: '' }
}

export function documentoParaBlocos(
  texto: string,
  blocosExistentes: OrcamentoOfertaBlocoDto[] = [],
  perfil?: PerfilOferta
): OrcamentoOfertaBlocoDto[] {
  const { porTipo } = parseDocumentoParaMapa(texto, blocosExistentes)

  if (!perfil) {
    const resultado: OrcamentoOfertaBlocoDto[] = []
    let ordem = 0
    for (const [tipo, secao] of porTipo.entries()) {
      const existente = blocosExistentes.find((b) => b.tipo === tipo)
      resultado.push({
        id: existente?.id ?? '',
        ordem: ordem++,
        tipo,
        titulo: secao.titulo,
        conteudo: secao.conteudo,
        editavel: existente?.editavel ?? true,
      })
    }
    return resultado
  }

  const base = normalizarBlocosOfertaTemplate(blocosExistentes, perfil)
  return base.map((bloco) => {
    const secao = porTipo.get(bloco.tipo)
    if (!secao) {
      return { ...bloco, conteudo: '' }
    }
    return {
      ...bloco,
      titulo: secao.titulo || bloco.titulo,
      conteudo: secao.conteudo,
    }
  })
}

export function modeloDocumentoVazio(perfil: PerfilOferta): string {
  return secoesTemplateParaPerfil(perfil)
    .map((tipo) => `## ${tituloPadraoTipoBloco(tipo)}`)
    .join('\n\n')
}
