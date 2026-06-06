import type { ServicoListItem } from '@/modules/catalogo/types/servico'

import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import { calcularPrecoUnitarioLinha } from './orcamentoPrecoLinha'

export function criarLinhaDeServicoCatalogo(
  servico: ServicoListItem,
  margemServicos: string,
  extras?: Partial<LinhaEditavelOrcamento>
): LinhaEditavelOrcamento {
  const custo = String(servico.preco_base ?? '0')
  const margem = margemServicos || '0'
  return {
    ordem: 0,
    tipo: 'SERVICO',
    origem: 'CATALOGO',
    editavel: true,
    servicoId: servico.id,
    servicoCodigo: servico.codigo,
    servicoUnidadeMedida: servico.unidade_medida_display || servico.unidade_medida,
    servicoCategoria: servico.categoria,
    descricao: servico.descricao,
    quantidade: '1',
    custo_unitario: custo,
    margem_percentual: margem,
    margem_minima: margem,
    aliquota_ipi: null,
    preco_unitario: calcularPrecoUnitarioLinha(custo, margem, null),
    ...extras,
  }
}
