/**
 * Tipos do painel inicial: KPIs agregados e mini-lista de projetos recentes.
 */

import type { StatusProjeto } from '@/modules/configurador_paineis/projetos/types/projeto'

/** Projeto resumido para a tabela «Projetos recentes». */
export interface ProjetoDashboardMini {
  id: string
  codigo: string
  nome: string
  status: StatusProjeto
  status_display: string
  criado_em: string
  atualizado_em: string
}

/** Payload de GET `/dashboard/resumo/` (projetos, composição, catálogo, cargas). */
export interface DashboardResumo {
  projetos: {
    total: number
    em_andamento: number
    finalizados: number
  }
  composicao: {
    pendencias_abertas: number
    sugestoes_pendentes: number
  }
  catalogo: {
    produtos_ativos: number
  }
  cargas: {
    total: number
  }
  projetos_recentes: ProjetoDashboardMini[]
}
