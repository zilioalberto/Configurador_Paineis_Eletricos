import type { CategoriaProduto } from '../types/categoria'
import type { ProdutoFormData } from '../types/produto'

export function defaultContatora(): NonNullable<ProdutoFormData['especificacao_contatora']> {
  return {
    corrente_ac3_a: '',
    corrente_ac1_a: '',
    tensao_bobina_v: 24,
    tipo_corrente_bobina: 'CC',
    contatos_aux_na: 0,
    contatos_aux_nf: 0,
    modo_montagem: 'TRILHO_DIN',
  }
}

export function defaultDisjuntorMotor(): NonNullable<
  ProdutoFormData['especificacao_disjuntor_motor']
> {
  return {
    faixa_ajuste_min_a: '',
    faixa_ajuste_max_a: '',
    contatos_aux_na: 0,
    contatos_aux_nf: 0,
    modo_montagem: 'TRILHO_DIN',
  }
}

export function defaultSeccionadora(): NonNullable<
  ProdutoFormData['especificacao_seccionadora']
> {
  return {
    corrente_ac1_a: '',
    corrente_ac3_a: '',
    tipo_montagem: 'TRILHO_DIN',
    tipo_fixacao: 'FURO_CENTRAL_M22_5',
    cor_manopla: 'PUNHO_PRETO',
  }
}

export const produtoFormEmpty = (): ProdutoFormData => ({
  codigo: '',
  descricao: '',
  categoria: '',
  unidade_medida: 'UN',
  valor_unitario: '0',
  fabricante: '',
  referencia_fabricante: '',
  largura_mm: '',
  altura_mm: '',
  profundidade_mm: '',
  observacoes_tecnicas: '',
  ativo: true,
  especificacao_contatora: null,
  especificacao_disjuntor_motor: null,
  especificacao_seccionadora: null,
})

export function applyCategoriaChange(
  prev: ProdutoFormData,
  categoriaId: string,
  categorias: CategoriaProduto[]
): ProdutoFormData {
  const cat = categorias.find((c) => c.id === categoriaId)
  const nome = cat?.nome
  return {
    ...prev,
    categoria: categoriaId,
    especificacao_contatora: nome === 'CONTATORA' ? defaultContatora() : null,
    especificacao_disjuntor_motor:
      nome === 'DISJUNTOR_MOTOR' ? defaultDisjuntorMotor() : null,
    especificacao_seccionadora: nome === 'SECCIONADORA' ? defaultSeccionadora() : null,
  }
}
