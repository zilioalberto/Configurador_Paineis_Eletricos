import { lazy, type ReactElement } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const TarefasKanbanPage = lazy(() => import('./pages/TarefasKanbanPage'))
const HorasGestaoPage = lazy(() => import('./pages/HorasGestaoPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const tarefasMenuItems: AppMenuItem[] = [
  {
    to: '/tarefas',
    label: 'Tarefas e Kanban',
    order: 45,
    requiresPermission: PERMISSION_KEYS.TAREFA_VISUALIZAR,
  },
  {
    to: '/tarefas/horas-gestao',
    label: 'Gestão de horas',
    order: 46,
    requiresPermission: PERMISSION_KEYS.TAREFA_VISUALIZAR_RELATORIOS,
  },
]

export const tarefasRoutes: ModuleRouteConfig[] = [
  {
    path: '/tarefas',
    element: withPermission(PERMISSION_KEYS.TAREFA_VISUALIZAR, <TarefasKanbanPage />),
  },
  {
    path: '/tarefas/horas-gestao',
    element: withPermission(
      PERMISSION_KEYS.TAREFA_VISUALIZAR_RELATORIOS,
      <HorasGestaoPage />
    ),
  },
]
