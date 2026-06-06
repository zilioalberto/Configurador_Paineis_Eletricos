import { describe, expect, it } from 'vitest'

import {
  ZFW_LOGO_ENGENHARIA_URL,
  ZFW_LOGO_PNG_URL,
  ZFW_LOGO_SIMBOLO_URL,
  ZFW_LOGO_SVG_URL,
} from '@/constants/brandingAssets'

describe('brandingAssets', () => {
  it('URLs dos logos em public/branding', () => {
    expect(ZFW_LOGO_PNG_URL).toMatch(/branding\/zfw-logo\.png$/)
    expect(ZFW_LOGO_ENGENHARIA_URL).toMatch(/branding\/zfw-logo-engenharia\.png$/)
    expect(ZFW_LOGO_SIMBOLO_URL).toMatch(/branding\/zfw-logo-simbolo\.png$/)
    expect(ZFW_LOGO_SVG_URL).toMatch(/branding\/zfw-logo\.svg$/)
  })
})
