import type { UserPermissionOption } from '@/modules/usuarios/types'

export type PermissionGroupDef = {
  readonly id: string
  readonly label: string
  readonly prefixes: readonly string[]
}

/** Agrupamento visual na matriz de permissões (administração de utilizadores). */
export const PERMISSION_GROUPS: readonly PermissionGroupDef[] = [
  { id: 'orcamento', label: 'Orçamentos', prefixes: ['orcamento.'] },
  {
    id: 'engenharia',
    label: 'Projetos, catálogo e almoxarifado',
    prefixes: ['projeto.', 'material.', 'catalogo.', 'almoxarifado.'],
  },
  { id: 'fiscal', label: 'Fiscal', prefixes: ['fiscal.'] },
  { id: 'cadastros', label: 'Cadastros', prefixes: ['cadastro.'] },
  { id: 'rh', label: 'RH', prefixes: ['rh.'] },
  { id: 'tarefas', label: 'Tarefas', prefixes: ['tarefa.'] },
  {
    id: 'erp',
    label: 'Configurações e relatórios do ERP',
    prefixes: ['configuracao_erp.', 'relatorio.'],
  },
  { id: 'admin', label: 'Administração', prefixes: ['usuario.', 'perfil.'] },
] as const

export type PermissionGroupSection = {
  readonly id: string
  readonly label: string
  readonly permissions: UserPermissionOption[]
}

function matchGroup(permissionValue: string): PermissionGroupDef | undefined {
  return PERMISSION_GROUPS.find((group) =>
    group.prefixes.some((prefix) => permissionValue.startsWith(prefix)),
  )
}

/** Divide opções da API em seções por módulo; o restante vai para "Outras". */
export function groupPermissionOptions(options: UserPermissionOption[]): PermissionGroupSection[] {
  const buckets = new Map<string, PermissionGroupSection>()
  const outros: UserPermissionOption[] = []

  for (const option of options) {
    const group = matchGroup(option.value)
    if (!group) {
      outros.push(option)
      continue
    }
    const existing = buckets.get(group.id)
    if (existing) {
      existing.permissions.push(option)
    } else {
      buckets.set(group.id, { id: group.id, label: group.label, permissions: [option] })
    }
  }

  const ordered = PERMISSION_GROUPS.map((group) => buckets.get(group.id)).filter(
    (section): section is PermissionGroupSection =>
      section != null && section.permissions.length > 0,
  )

  if (outros.length > 0) {
    ordered.push({ id: 'outras', label: 'Outras', permissions: outros })
  }

  return ordered
}
