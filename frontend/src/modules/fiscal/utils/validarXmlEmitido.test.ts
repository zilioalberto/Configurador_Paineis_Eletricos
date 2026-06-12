import { describe, expect, it } from 'vitest'

import { validarXmlEmitidoParaImportacao } from './validarXmlEmitido'

const CNPJ_ZFW = '07284171000139'

describe('validarXmlEmitidoParaImportacao', () => {
  it('aceita xml com emitente da empresa', () => {
    const xml = `<nfeProc><NFe><infNFe>
      <emit><CNPJ>${CNPJ_ZFW}</CNPJ><xNome>ZFW</xNome></emit>
    </infNFe></NFe></nfeProc>`
    const resultado = validarXmlEmitidoParaImportacao(xml, CNPJ_ZFW, CNPJ_ZFW)
    expect(resultado.valido).toBe(true)
  })

  it('rejeita xml de outro emitente', () => {
    const xml = `<nfeProc><NFe><infNFe>
      <emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor</xNome></emit>
    </infNFe></NFe></nfeProc>`
    const resultado = validarXmlEmitidoParaImportacao(xml, CNPJ_ZFW, '12345678000199')
    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toMatch(/ZFW/i)
  })

  it('rejeita conteudo que nao e xml', () => {
    const resultado = validarXmlEmitidoParaImportacao('texto plano', CNPJ_ZFW, CNPJ_ZFW)
    expect(resultado.valido).toBe(false)
  })
})
