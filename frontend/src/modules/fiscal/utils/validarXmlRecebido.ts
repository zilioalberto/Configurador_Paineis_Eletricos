export type ResultadoValidacaoXmlRecebido = {
  readonly valido: boolean
  readonly motivo: string
}

function somenteDigitosCnpj(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 14)
}

function localName(el: Element): string {
  return el.localName || el.tagName
}

function filho(element: Element, nome: string): Element | null {
  return Array.from(element.children).find((child) => localName(child) === nome) ?? null
}

function grupoDescendente(element: Element | Document, nomes: string[]): Element | null {
  const root = element instanceof Document ? element.documentElement : element
  for (const el of Array.from(root.getElementsByTagName('*'))) {
    if (nomes.includes(localName(el))) return el
  }
  return null
}

function textoFilho(element: Element | null, nomes: string[]): string {
  if (!element) return ''
  for (const nome of nomes) {
    const child = filho(element, nome)
    if (child?.textContent?.trim()) return child.textContent.trim()
  }
  return ''
}

/** Extrai CNPJ/CPF do destinatário de um XML de NF-e. */
export function extrairCnpjDestinatarioNfe(xml: string): string {
  const texto = xml.trim()
  if (!texto.startsWith('<')) return ''
  const doc = new DOMParser().parseFromString(texto, 'application/xml')
  if (doc.querySelector('parsererror')) return ''
  const dest = grupoDescendente(doc, ['dest'])
  return somenteDigitosCnpj(textoFilho(dest, ['CNPJ', 'CPF']))
}

function xmlPareceNfe(xml: string): boolean {
  const texto = xml.trim().toLowerCase()
  return (
    texto.includes('nfeproc') ||
    texto.includes('<nfe') ||
    texto.includes('portalfiscal.inf.br/nfe')
  )
}

/** Valida estrutura XML e CNPJ destinatário antes de enviar NF-e recebida ao servidor. */
export function validarXmlRecebidoParaImportacao(
  xml: string,
  cnpjEmpresa: string | undefined,
): ResultadoValidacaoXmlRecebido {
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
  if (!xmlPareceNfe(texto)) {
    return { valido: false, motivo: 'Arquivo não parece ser NF-e.' }
  }

  const cnpjEmpresaNorm = somenteDigitosCnpj(cnpjEmpresa ?? '')
  if (cnpjEmpresaNorm.length !== 14) {
    return {
      valido: false,
      motivo: 'CNPJ da empresa (ZFW) não está configurado no servidor.',
    }
  }

  const cnpjDestinatario = extrairCnpjDestinatarioNfe(texto)
  if (cnpjDestinatario.length !== 14) {
    return { valido: false, motivo: 'CNPJ do destinatário não encontrado no XML.' }
  }

  if (cnpjDestinatario !== cnpjEmpresaNorm) {
    return {
      valido: false,
      motivo:
        'Este XML não é destinado à ZFW. Importe apenas NF-es recebidas pela empresa; ' +
        'notas emitidas pela ZFW devem ir em NF-es emitidas.',
    }
  }

  return { valido: true, motivo: '' }
}
