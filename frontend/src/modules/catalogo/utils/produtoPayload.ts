import type { CategoriaProduto } from '../types/categoria'
import type { ProdutoFormData } from '../types/produto'

function dec(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

function num(s: string): string | number {
  const t = s.trim()
  if (t === '') return 0
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function specContatora(
  s: NonNullable<ProdutoFormData['especificacao_contatora']>
) {
  return {
    corrente_ac3_a: dec(s.corrente_ac3_a),
    corrente_ac1_a: dec(s.corrente_ac1_a),
    tensao_bobina_v: s.tensao_bobina_v,
    tipo_corrente_bobina: s.tipo_corrente_bobina,
    contatos_aux_na: s.contatos_aux_na,
    contatos_aux_nf: s.contatos_aux_nf,
    modo_montagem: s.modo_montagem,
  }
}

function specDisjuntor(
  s: NonNullable<ProdutoFormData['especificacao_disjuntor_motor']>
) {
  return {
    faixa_ajuste_min_a: num(s.faixa_ajuste_min_a),
    faixa_ajuste_max_a: num(s.faixa_ajuste_max_a),
    contatos_aux_na: s.contatos_aux_na,
    contatos_aux_nf: s.contatos_aux_nf,
    modo_montagem: s.modo_montagem,
  }
}

function specSeccionadora(
  s: NonNullable<ProdutoFormData['especificacao_seccionadora']>
) {
  return {
    corrente_ac1_a: dec(s.corrente_ac1_a),
    corrente_ac3_a: dec(s.corrente_ac3_a),
    tipo_montagem: s.tipo_montagem,
    tipo_fixacao: s.tipo_fixacao,
    cor_manopla: s.cor_manopla,
  }
}

export function produtoFormToApiPayload(
  data: ProdutoFormData,
  categorias: CategoriaProduto[]
): Record<string, unknown> {
  const cat = categorias.find((c) => c.id === data.categoria || c.nome === data.categoria)
  const nome = cat?.nome ?? data.categoria

  const base: Record<string, unknown> = {
    codigo: data.codigo.trim(),
    descricao: data.descricao.trim(),
    categoria: data.categoria,
    unidade_medida: data.unidade_medida,
    valor_unitario: num(data.valor_unitario),
    fabricante: data.fabricante.trim(),
    referencia_fabricante: data.referencia_fabricante.trim(),
    largura_mm: dec(data.largura_mm),
    altura_mm: dec(data.altura_mm),
    profundidade_mm: dec(data.profundidade_mm),
    observacoes_tecnicas: data.observacoes_tecnicas.trim(),
    ativo: data.ativo,
  }

  if (nome === 'CONTATORA' && data.especificacao_contatora) {
    base.especificacao_contatora = specContatora(data.especificacao_contatora)
  }
  if (nome === 'DISJUNTOR_MOTOR' && data.especificacao_disjuntor_motor) {
    base.especificacao_disjuntor_motor = specDisjuntor(
      data.especificacao_disjuntor_motor
    )
  }
  if (nome === 'SECCIONADORA' && data.especificacao_seccionadora) {
    base.especificacao_seccionadora = specSeccionadora(
      data.especificacao_seccionadora
    )
  }

  return base
}
