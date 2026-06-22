import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SefazSyncIndisponivelAlert from './SefazSyncIndisponivelAlert'

describe('SefazSyncIndisponivelAlert', () => {
  it('exibe mensagem quando sync indisponível', () => {
    render(
      <SefazSyncIndisponivelAlert
        config={{
          cnpj_empresa: '11222333000199',
          sefaz_sync_disponivel: false,
          sefaz_sync_modo: 'stub',
          sefaz_sync_mensagem: 'Modo simulado (stub).',
        }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/sincronização com a sefaz indisponível/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/modo simulado \(stub\)/i)
  })

  it('não renderiza quando sync disponível', () => {
    const { container } = render(
      <SefazSyncIndisponivelAlert
        config={{
          cnpj_empresa: '11222333000199',
          sefaz_sync_disponivel: true,
          sefaz_sync_modo: 'producao',
        }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
