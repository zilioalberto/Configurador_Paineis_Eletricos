import { describe, expect, it } from 'vitest'

import {
  extrairCnpjDestinatarioNfe,
  validarXmlRecebidoParaImportacao,
} from './validarXmlRecebido'

const CNPJ_ZFW = '07284171000139'

describe('validarXmlRecebidoParaImportacao', () => {
  it('aceita xml com destinatario da empresa', () => {
    const xml = `<nfeProc><NFe><infNFe>
      <dest><CNPJ>${CNPJ_ZFW}</CNPJ><xNome>ZFW</xNome></dest>
    </infNFe></NFe></nfeProc>`
    const resultado = validarXmlRecebidoParaImportacao(xml, CNPJ_ZFW)
    expect(resultado.valido).toBe(true)
  })

  it('rejeita xml destinado a outra empresa', () => {
    const xml = `<nfeProc><NFe><infNFe>
      <dest><CNPJ>98765432000188</CNPJ><xNome>Outro</xNome></dest>
    </infNFe></NFe></nfeProc>`
    const resultado = validarXmlRecebidoParaImportacao(xml, CNPJ_ZFW)
    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toMatch(/ZFW/i)
  })

  it('extrai cnpj do destinatario', () => {
    const xml = `<nfeProc><NFe><infNFe>
      <dest><CNPJ>${CNPJ_ZFW}</CNPJ></dest>
    </infNFe></NFe></nfeProc>`
    expect(extrairCnpjDestinatarioNfe(xml)).toBe(CNPJ_ZFW)
  })
})
