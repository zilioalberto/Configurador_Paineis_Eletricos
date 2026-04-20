import { describe, expect, it } from 'vitest'

import { ZFW_LOGO_PNG_URL } from '@/constants/brandingAssets'

describe('brandingAssets', () => {
  it('URL do logo termina no ficheiro PNG em branding', () => {
    expect(ZFW_LOGO_PNG_URL).toMatch(/branding\/zfw-logo\.png$/)
  })
})
