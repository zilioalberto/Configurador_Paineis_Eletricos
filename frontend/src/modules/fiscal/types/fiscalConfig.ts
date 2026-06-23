export type SefazSyncModo = 'producao' | 'stub' | 'indisponivel'

export type FiscalModuloConfigDto = {
  readonly cnpj_empresa: string
  readonly sefaz_provider?: string
  readonly certificado_a1_configurado?: boolean
  readonly sefaz_sync_disponivel?: boolean
  readonly sefaz_sync_modo?: SefazSyncModo
  readonly sefaz_sync_mensagem?: string
  /** @deprecated Use sefaz_sync_disponivel */
  readonly sefaz_sync_configurado?: boolean
  readonly nfse_adn_provider?: string
  readonly nfse_adn_sync_disponivel?: boolean
  readonly nfse_adn_sync_modo?: SefazSyncModo
  readonly nfse_adn_sync_mensagem?: string
}

export function isSefazSyncDisponivel(
  config: Pick<FiscalModuloConfigDto, 'sefaz_sync_disponivel' | 'sefaz_sync_configurado'> | null | undefined,
): boolean {
  if (config?.sefaz_sync_disponivel != null) {
    return config.sefaz_sync_disponivel
  }
  return config?.sefaz_sync_configurado === true
}

export function isNfseAdnSyncDisponivel(
  config: Pick<FiscalModuloConfigDto, 'nfse_adn_sync_disponivel'> | null | undefined,
): boolean {
  return config?.nfse_adn_sync_disponivel === true
}
