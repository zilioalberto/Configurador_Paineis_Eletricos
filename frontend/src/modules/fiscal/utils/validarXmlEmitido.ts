export type ResultadoValidacaoXmlEmitido = {
  readonly valido: boolean
  readonly motivo: string
}

function somenteDigitosCnpj(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 14)
}

function xmlPareceFiscal(xml: string): boolean {
  const texto = xml.trim().toLowerCase()
  return (
    texto.includes('nfeproc') ||
    texto.includes('<nfe') ||
    texto.includes('portalfiscal.inf.br/nfe') ||
    texto.includes('compnfse') ||
    texto.includes('<nfse')
  )
}

/** Valida estrutura XML e CNPJ emitente/prestador antes de enviar ao servidor. */
export function validarXmlEmitidoParaImportacao(
  xml: string,
  cnpjEmpresa: string | undefined,
  cnpjEmitenteXml: string,
): ResultadoValidacaoXmlEmitido {
  const texto = xml.trim()
  if (!texto) {
    return { valido: false, motivo: 'XML vazio.' }
  }
  if (!texto.startsWith('<')) {
    return { valido: false, motivo: 'Arquivo não parece ser XML válido.' }
  }

  const doc = new DOMParser().parseFromString(texto, 'application/xml')
  if (doc.querySelector('parsererror')) {
    return { valido: false, motivo: 'XML malformado ou inválido.' }
  }
  if (!xmlPareceFiscal(texto)) {
    return { valido: false, motivo: 'Arquivo não parece ser NF-e ou NFS-e.' }
  }

  const cnpjEmpresaNorm = somenteDigitosCnpj(cnpjEmpresa ?? '')
  if (cnpjEmpresaNorm.length !== 14) {
    return {
      valido: false,
      motivo: 'CNPJ da empresa (ZFW) não está configurado no servidor.',
    }
  }

  const cnpjEmitente = somenteDigitosCnpj(cnpjEmitenteXml)
  if (cnpjEmitente.length !== 14) {
    return { valido: false, motivo: 'CNPJ do emitente/prestador não encontrado no XML.' }
  }

  if (cnpjEmitente !== cnpjEmpresaNorm) {
    return {
      valido: false,
      motivo:
        'Este XML não foi emitido pela ZFW. Importe apenas saídas emitidas pela empresa; ' +
        'notas de fornecedores devem ir em NF-es recebidas.',
    }
  }

  return { valido: true, motivo: '' }
}
