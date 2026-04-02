import type { CategoriaProduto } from '../types/categoria'
import type { ProdutoDetail, ProdutoFormData } from '../types/produto'
import {
  applyCategoriaChange,
  defaultContatora,
  defaultDisjuntorMotor,
  defaultSeccionadora,
  produtoFormEmpty,
} from './produtoFormDefaults'

function str(v: unknown): string {
  if (v == null) return ''
  return String(v)
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function produtoDetailToForm(
  p: ProdutoDetail,
  categorias: CategoriaProduto[]
): ProdutoFormData {
  let form: ProdutoFormData = {
    ...produtoFormEmpty(),
    codigo: p.codigo ?? '',
    descricao: p.descricao ?? '',
    categoria: p.categoria ?? '',
    unidade_medida: (p.unidade_medida as ProdutoFormData['unidade_medida']) ?? 'UN',
    valor_unitario: str(p.valor_unitario) || '0',
    fabricante: p.fabricante ?? '',
    referencia_fabricante: p.referencia_fabricante ?? '',
    largura_mm: str(p.largura_mm),
    altura_mm: str(p.altura_mm),
    profundidade_mm: str(p.profundidade_mm),
    observacoes_tecnicas: p.observacoes_tecnicas ?? '',
    ativo: p.ativo !== false,
    especificacao_contatora: null,
    especificacao_disjuntor_motor: null,
    especificacao_seccionadora: null,
  }

  form = applyCategoriaChange(form, form.categoria, categorias)

  const ec = p.especificacao_contatora
  if (ec && form.especificacao_contatora) {
    form = {
      ...form,
      especificacao_contatora: {
        ...defaultContatora(),
        corrente_ac3_a: str(ec.corrente_ac3_a),
        corrente_ac1_a: str(ec.corrente_ac1_a),
        tensao_bobina_v: toNum(ec.tensao_bobina_v, 24),
        tipo_corrente_bobina:
          ec.tipo_corrente_bobina === 'CA' || ec.tipo_corrente_bobina === 'CC'
            ? ec.tipo_corrente_bobina
            : 'CC',
        contatos_aux_na: toNum(ec.contatos_aux_na, 0),
        contatos_aux_nf: toNum(ec.contatos_aux_nf, 0),
        modo_montagem: str(ec.modo_montagem) || 'TRILHO_DIN',
      },
    }
  }

  const ed = p.especificacao_disjuntor_motor
  if (ed && form.especificacao_disjuntor_motor) {
    form = {
      ...form,
      especificacao_disjuntor_motor: {
        ...defaultDisjuntorMotor(),
        faixa_ajuste_min_a: str(ed.faixa_ajuste_min_a),
        faixa_ajuste_max_a: str(ed.faixa_ajuste_max_a),
        contatos_aux_na: toNum(ed.contatos_aux_na, 0),
        contatos_aux_nf: toNum(ed.contatos_aux_nf, 0),
        modo_montagem: str(ed.modo_montagem) || 'TRILHO_DIN',
      },
    }
  }

  const es = p.especificacao_seccionadora
  if (es && form.especificacao_seccionadora) {
    form = {
      ...form,
      especificacao_seccionadora: {
        ...defaultSeccionadora(),
        corrente_ac1_a: str(es.corrente_ac1_a),
        corrente_ac3_a: str(es.corrente_ac3_a),
        tipo_montagem: str(es.tipo_montagem) || 'TRILHO_DIN',
        tipo_fixacao: str(es.tipo_fixacao) || 'FURO_CENTRAL_M22_5',
        cor_manopla: str(es.cor_manopla) || 'PUNHO_PRETO',
      },
    }
  }

  return form
}
