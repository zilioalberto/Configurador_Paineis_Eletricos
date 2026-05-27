export type ServicoListItem = {
  id: string
  codigo: string
  descricao: string
  categoria: string
  unidade_medida: string
  unidade_medida_display?: string
  preco_base: string
  preco_atualizado_em?: string | null
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

export type ServicoDetail = ServicoListItem & {
  observacoes?: string
}

export type ServicoFormData = {
  codigo: string
  descricao: string
  categoria: string
  unidade_medida: string
  preco_base: string
  ativo: boolean
  observacoes: string
}

export function servicoFormEmpty(): ServicoFormData {
  return {
    codigo: '',
    descricao: '',
    categoria: '',
    unidade_medida: 'HORAS',
    preco_base: '0',
    ativo: true,
    observacoes: '',
  }
}

export function servicoDetailToForm(servico: ServicoDetail): ServicoFormData {
  return {
    codigo: servico.codigo ?? '',
    descricao: servico.descricao ?? '',
    categoria: servico.categoria ?? '',
    unidade_medida: servico.unidade_medida ?? 'HORAS',
    preco_base: String(servico.preco_base ?? '0'),
    ativo: servico.ativo !== false,
    observacoes: servico.observacoes ?? '',
  }
}

export function servicoFormToApiPayload(data: ServicoFormData) {
  return {
    codigo: data.codigo.trim(),
    descricao: data.descricao.trim(),
    categoria: data.categoria.trim(),
    unidade_medida: data.unidade_medida,
    preco_base: data.preco_base.trim() || '0',
    ativo: data.ativo,
    observacoes: data.observacoes.trim(),
  }
}
