import { describe, expect, it } from 'vitest'

import { appChildRoutes, appMenuItems } from '@/app/navigation/collectNavigation'

describe('collectNavigation', () => {
  it('agrega rotas dos modulos', () => {
    expect(appChildRoutes.length).toBeGreaterThan(5)
    expect(appChildRoutes.some((route) => route.path === '/projetos')).toBe(true)
    expect(appChildRoutes.some((route) => route.path === '/cargas')).toBe(true)
  })

  it('ordena menu pelo campo order', () => {
    const orders = appMenuItems.map((item) => item.order ?? 100)
    const sorted = [...orders].sort((a, b) => a - b)
    expect(orders).toEqual(sorted)
  })
})
