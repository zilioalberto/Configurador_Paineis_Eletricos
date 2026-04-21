import { describe, expect, it } from 'vitest'

import {
  nomeArquivoContentDisposition,
  slugNomeArquivo,
  trimAsciiDoubleQuotes,
} from './composicaoExportHelpers'

describe('trimAsciiDoubleQuotes', () => {
  it('remove aspas nas pontas', () => {
    expect(trimAsciiDoubleQuotes('"foo.pdf"')).toBe('foo.pdf')
    expect(trimAsciiDoubleQuotes('"""x"""')).toBe('x')
  })
})

describe('slugNomeArquivo', () => {
  it('devolve vazio para entrada vazia', () => {
    expect(slugNomeArquivo(undefined)).toBe('')
    expect(slugNomeArquivo('')).toBe('')
  })

  it('normaliza acentos e mantém letras ASCII', () => {
    expect(slugNomeArquivo('Relatório São Paulo')).toBe('Relatorio_Sao_Paulo')
  })

  it('colapsa caracteres inválidos num único underscore e corta extremos', () => {
    expect(slugNomeArquivo('  abc  @@  def  ')).toBe('abc_def')
    expect(slugNomeArquivo('___x___')).toBe('x')
  })

  it('mantém hífen e underscore', () => {
    expect(slugNomeArquivo('Código-04001')).toBe('Codigo-04001')
  })
})

describe('nomeArquivoContentDisposition', () => {
  it('usa fallback sem header', () => {
    expect(nomeArquivoContentDisposition(undefined, 'f.xlsx')).toBe('f.xlsx')
    expect(nomeArquivoContentDisposition('', 'f.xlsx')).toBe('f.xlsx')
  })

  it('filename= entre aspas', () => {
    expect(
      nomeArquivoContentDisposition(
        'attachment; filename="Export composição.xlsx"',
        'fb.xlsx'
      )
    ).toBe('Export composição.xlsx')
  })

  it('filename= sem aspas', () => {
    expect(
      nomeArquivoContentDisposition('attachment; filename=plain.xlsx', 'fb.xlsx')
    ).toBe('plain.xlsx')
  })

  it('filename*=UTF-8', () => {
    expect(
      nomeArquivoContentDisposition(
        "attachment; filename*=UTF-8''composicao%20%C3%A1.xlsx",
        'fb.xlsx'
      )
    ).toBe('composicao á.xlsx')
  })

  it('fallback se header inválido para filename*', () => {
    expect(
      nomeArquivoContentDisposition(
        "attachment; filename*=UTF-8''%ZZ",
        'fallback.xlsx'
      )
    ).toBe('fallback.xlsx')
  })
})
