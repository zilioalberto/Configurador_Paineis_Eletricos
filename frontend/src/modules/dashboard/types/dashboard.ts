import type { StatusProjeto } from '@/modules/projetos/types/projeto'

export interface ProjetoDashboardMini {
  id: string
  codigo: string
  nome: string
  status: StatusProjeto
  status_display: string
  criado_em: string
  atualizado_em: string
}

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
