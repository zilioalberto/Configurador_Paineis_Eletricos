import type { OrcamentoOfertaBlocoDto, PerfilOferta, TipoBlocoOferta } from '../types/orcamentos'

const TIPOS_CONDICOES_TEMPLATE = new Set([
  'PRAZO_ENTREGA',
  'CONDICOES_PAGAMENTO',
  'CONDICOES_GERAIS',
  'GARANTIA',
  'OBSERVACOES',
])

const TIPOS_APOS_INVESTIMENTO_TEMPLATE = new Set(['EXCLUSOES'])

/** Seções alinhadas ao template DOCX (docxtpl). */
export const TIPOS_BLOCO_EXCLUIDOS_EDITOR: ReadonlySet<TipoBlocoOferta> = new Set([
  'INVESTIMENTO',
  'APROVACAO',
])

export const SECOES_TEMPLATE_SOLUCAO_COMPLETA: readonly TipoBlocoOferta[] = [
  'INTRODUCAO',
  'ESCOPO',
  'ITENS_FORNECIMENTO',
  'SERVICOS',
  'EXCLUSOES',
  'PRAZO_ENTREGA',
  'CONDICOES_PAGAMENTO',
  'CONDICOES_GERAIS',
  'GARANTIA',
  'OBSERVACOES',
]

export const SECOES_TEMPLATE_MATERIAIS: readonly TipoBlocoOferta[] = [
  'INTRODUCAO',
  'PRAZO_ENTREGA',
  'CONDICOES_PAGAMENTO',
  'CONDICOES_GERAIS',
  'GARANTIA',
  'OBSERVACOES',
]

const LABEL_POR_TIPO: Record<TipoBlocoOferta, string> = {
  INTRODUCAO: 'Apresentação',
  ESCOPO: 'Escopo de fornecimento',
  ITENS_FORNECIMENTO: 'Itens considerados',
  SERVICOS: 'Serviços considerados',
  EXCLUSOES: 'Exclusões',
  INVESTIMENTO: 'Investimento',
  PRAZO_ENTREGA: 'Prazo de entrega',
  CONDICOES_PAGAMENTO: 'Condições de pagamento',
  CONDICOES_GERAIS: 'Condições gerais',
  GARANTIA: 'Garantia',
  APROVACAO: 'Aprovação',
  OBSERVACOES: 'Observações',
}

const DICA_POR_TIPO: Partial<Record<TipoBlocoOferta, string>> = {
  INTRODUCAO: 'Texto de abertura da carta (parágrafos separados por linha em branco).',
  ESCOPO: 'Descreva o fornecimento. Use linha em branco entre parágrafos e "- " para listas.',
  ITENS_FORNECIMENTO: 'Liste os itens considerados (um por linha com "- ").',
  SERVICOS: 'Serviços incluídos na proposta.',
  EXCLUSOES: 'O que não está incluído.',
  PRAZO_ENTREGA: 'Prazo ou referência de disponibilidade.',
  CONDICOES_PAGAMENTO: 'Forma e condições de pagamento.',
  CONDICOES_GERAIS: 'Impostos, faturamento, validade comercial.',
  GARANTIA: 'Prazos e condições de garantia.',
  OBSERVACOES: 'Observações finais ao cliente.',
}

export function secoesTemplateParaPerfil(perfil: PerfilOferta): readonly TipoBlocoOferta[] {
  return perfil === 'SOLUCAO_COMPLETA' ? SECOES_TEMPLATE_SOLUCAO_COMPLETA : SECOES_TEMPLATE_MATERIAIS
}

export function rotuloTipoBlocoOferta(tipo: TipoBlocoOferta): string {
  return LABEL_POR_TIPO[tipo] ?? tipo
}

export function dicaSecaoOferta(tipo: TipoBlocoOferta): string {
  return DICA_POR_TIPO[tipo] ?? 'Linha em branco = novo parágrafo. "- " no início = item de lista.'
}

export function tituloPadraoTipoBloco(tipo: TipoBlocoOferta): string {
  return rotuloTipoBlocoOferta(tipo)
}

const TITULOS_LEGADOS_INTRODUCAO = new Set(['introducao', 'intro'])

/** Título exibido no editor/prévia (substitui rótulo antigo «Introdução»). */
export function tituloExibicaoBlocoOferta(bloco: OrcamentoOfertaBlocoDto): string {
  const bruto = (bloco.titulo || '').trim()
  if (
    bloco.tipo === 'INTRODUCAO' &&
    (!bruto || TITULOS_LEGADOS_INTRODUCAO.has(bruto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')))
  ) {
    return tituloPadraoTipoBloco('INTRODUCAO')
  }
  return bruto || tituloPadraoTipoBloco(bloco.tipo)
}

export function blocoEditavelNoDocumento(bloco: OrcamentoOfertaBlocoDto, podeEditar: boolean): boolean {
  return podeEditar && bloco.editavel !== false
}

export function secaoOfertaComConteudo(bloco: OrcamentoOfertaBlocoDto): boolean {
  return Boolean((bloco.conteudo || '').trim())
}

export function estimarLinhasTextarea(conteudo: string, minimo = 4, maximo = 28): number {
  const linhas = (conteudo || '').split('\n').length
  return Math.min(maximo, Math.max(minimo, linhas + 1))
}

/** Ordena e completa seções conforme o perfil (template Word). Reseta `ordem` ao padrão. */
export function normalizarBlocosOfertaTemplate(
  blocos: OrcamentoOfertaBlocoDto[],
  perfil: PerfilOferta
): OrcamentoOfertaBlocoDto[] {
  const ordemTipos = secoesTemplateParaPerfil(perfil)
  const porTipo = new Map<TipoBlocoOferta, OrcamentoOfertaBlocoDto>()
  for (const bloco of blocos) {
    if (TIPOS_BLOCO_EXCLUIDOS_EDITOR.has(bloco.tipo)) continue
    if (!porTipo.has(bloco.tipo)) {
      porTipo.set(bloco.tipo, bloco)
    }
  }
  return ordemTipos.map((tipo, ordem) => {
    const existente = porTipo.get(tipo)
    if (existente) {
      return { ...existente, ordem, titulo: existente.titulo?.trim() || tituloPadraoTipoBloco(tipo) }
    }
    return {
      id: '',
      ordem,
      tipo,
      titulo: tituloPadraoTipoBloco(tipo),
      conteudo: '',
      editavel: true,
    }
  })
}

/** Completa seções do template sem sobrescrever `ordem` (editor e arraste). */
export function mesclarBlocosTemplateEditor(
  blocos: OrcamentoOfertaBlocoDto[],
  perfil: PerfilOferta
): OrcamentoOfertaBlocoDto[] {
  const porTipo = new Map<TipoBlocoOferta, OrcamentoOfertaBlocoDto>()
  for (const bloco of blocos) {
    if (TIPOS_BLOCO_EXCLUIDOS_EDITOR.has(bloco.tipo)) continue
    if (!porTipo.has(bloco.tipo)) {
      porTipo.set(bloco.tipo, bloco)
    }
  }
  const template = secoesTemplateParaPerfil(perfil)
  let proximaOrdem =
    porTipo.size > 0 ? Math.max(...[...porTipo.values()].map((b) => b.ordem)) + 1 : 0

  for (const tipo of template) {
    const existente = porTipo.get(tipo)
    if (existente) {
      porTipo.set(tipo, {
        ...existente,
        titulo: existente.titulo?.trim() || tituloPadraoTipoBloco(tipo),
      })
      continue
    }
    porTipo.set(tipo, {
      id: '',
      ordem: proximaOrdem++,
      tipo,
      titulo: tituloPadraoTipoBloco(tipo),
      conteudo: '',
      editavel: true,
    })
  }
  return [...porTipo.values()].sort((a, b) => a.ordem - b.ordem)
}

/** Ordem do editor alinhada à prévia/PDF (corpo → investimento → exclusões → condições). */
export function agruparBlocosEditorOferta(
  blocos: OrcamentoOfertaBlocoDto[],
  perfil: PerfilOferta
): {
  intro: OrcamentoOfertaBlocoDto | undefined
  corpo: OrcamentoOfertaBlocoDto[]
  aposInvestimento: OrcamentoOfertaBlocoDto[]
  condicoes: OrcamentoOfertaBlocoDto[]
} {
  const sorted = mesclarBlocosTemplateEditor(blocos, perfil)
  const ehCorpo = (tipo: TipoBlocoOferta) =>
    tipo !== 'INTRODUCAO' &&
    !TIPOS_APOS_INVESTIMENTO_TEMPLATE.has(tipo) &&
    !TIPOS_CONDICOES_TEMPLATE.has(tipo)

  return {
    intro: sorted.find((b) => b.tipo === 'INTRODUCAO'),
    corpo: sorted.filter((b) => ehCorpo(b.tipo)),
    aposInvestimento: sorted.filter((b) => TIPOS_APOS_INVESTIMENTO_TEMPLATE.has(b.tipo)),
    condicoes: sorted.filter((b) => TIPOS_CONDICOES_TEMPLATE.has(b.tipo)),
  }
}

/** Payload de salvamento: somente seções do template. */
export function blocosOfertaParaPersistencia(
  blocos: OrcamentoOfertaBlocoDto[],
  perfil: PerfilOferta
): OrcamentoOfertaBlocoDto[] {
  return normalizarBlocosOfertaTemplate(blocos, perfil).filter((b) =>
    (b.conteudo || '').trim()
  )
}
