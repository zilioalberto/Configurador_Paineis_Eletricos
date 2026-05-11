import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVELOPER, getWhatsAppUrl } from '@/constants/developer'
import { ZFW_SITE_URL } from '@/constants/zfwSite'
import AppFooter from './AppFooter'

describe('AppFooter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exibe copyright com ano atual, marca e links institucionais', () => {
    render(<AppFooter />)

    expect(screen.getByRole('contentinfo', { name: 'Rodapé' })).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()

    const site = screen.getByRole('link', { name: 'ZFW Engenharia' })
    expect(site).toHaveAttribute('href', ZFW_SITE_URL)
    expect(site).toHaveAttribute('target', '_blank')
    expect(site).toHaveAttribute('rel', 'noopener noreferrer')

    expect(screen.getByText(/Portal ZFW - ERP modular/)).toBeInTheDocument()
    expect(screen.getByText(DEVELOPER.name)).toBeInTheDocument()

    const linkedin = screen.getByRole('link', { name: 'LinkedIn' })
    expect(linkedin).toHaveAttribute('href', DEVELOPER.linkedinUrl)

    const waUrl = getWhatsAppUrl()
    const inlineWa = screen.getByRole('link', { name: DEVELOPER.whatsappDisplay })
    expect(inlineWa).toHaveAttribute('href', waUrl)

    const fab = screen.getByRole('link', {
      name: `WhatsApp — ${DEVELOPER.whatsappDisplay}`,
    })
    expect(fab).toHaveAttribute('href', waUrl)
    expect(fab).toHaveClass('app-footer-wa-fab')
  })
})
