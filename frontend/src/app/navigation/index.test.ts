import { describe, expect, it } from 'vitest'

import { appChildRoutes, appMenuItems, isAppMenuGroup } from './index'

describe('app/navigation (barrel)', () => {
  it('exporta rotas filhas e itens de menu não vazios', () => {
    expect(appChildRoutes.length).toBeGreaterThan(0)
    expect(appMenuItems.length).toBeGreaterThan(0)
  })

  it('reexporta isAppMenuGroup', () => {
    expect(
      isAppMenuGroup({ type: 'group', id: 'g', label: 'Grupo', children: [] })
    ).toBe(true)
    expect(isAppMenuGroup({ to: '/', label: 'Início' })).toBe(false)
  })
})
