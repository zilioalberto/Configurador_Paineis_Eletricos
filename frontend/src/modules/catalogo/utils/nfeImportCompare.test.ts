import { describe, expect, it } from 'vitest'
import type { NfeItemPreview, NfeProdutoExistenteResumo } from '../types/nfeImport'
import {
  buildNfeCamposComparacao,
  nfeItemLinhaDivergeDoCatalogo,
} from './nfeImportCompare'

const itemBase: NfeItemPreview = {
  n_item: 1,
  c_prod: 'MTR-01',
  x_prod: 'Motor trifasico 2CV',
  ncm: '8501.10.10',
  cest: '12.345.67',
  c_ean: 'SEM GTIN',
  u_com: 'PC',
  unidade_catalogo: 'UN',
  u_trib_catalogo: 'UN',
  q_com: '2',
  v_un_com: '123,45',
  cfop: '5102',
  imposto: {
    orig: '0',
    p_ipi: '1,5',
  },
}

const produtoBase: NfeProdutoExistenteResumo = {
  id: 'p1',
  codigo: 'MTR-01',
  descricao: 'MOTOR TRIFASICO 2CV',
  categoria: 'cat-motores',
  unidade_medida: 'UN',
  unidade_tributavel: 'UN',
  preco_base: '123.45',
  ncm: '85011010',
  cest: '1234567',
  gtin: 'SEM GTIN',
  origem_mercadoria: '0',
  fabricante: '',
  referencia_fabricante: '',
  aliquota_ipi: '1.5000',
  fabricante_parceiro_id: '',
}

describe('nfeImportCompare', () => {
  it('identifica produto alinhado entre XML e catalogo', () => {
    expect(nfeItemLinhaDivergeDoCatalogo(itemBase, 'cat-motores', produtoBase)).toBe(false)
    expect(nfeItemLinhaDivergeDoCatalogo(itemBase, 'cat-motores', null)).toBe(false)
  })

  it('sinaliza divergencias de campos fiscais e comerciais', () => {
    expect(
      nfeItemLinhaDivergeDoCatalogo(
        {
          ...itemBase,
          unidade_catalogo: 'XX',
          u_trib_catalogo: 'INVALIDA',
          v_un_com: '999',
          imposto: { orig: '9', p_ipi: 'abc' },
        },
        'cat-diferente',
        { ...produtoBase, gtin: '789123', origem_mercadoria: '1' }
      )
    ).toBe(true)
  })

  it('monta linhas de comparacao com valores normalizados', () => {
    const rows = buildNfeCamposComparacao(
      itemBase,
      'cat-motores',
      'Motores',
      produtoBase
    )

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'categoria', xml: 'Motores', diverge: false }),
        expect.objectContaining({ id: 'preco_base', xml: '123.45', catalogo: '123.45' }),
        expect.objectContaining({ id: 'ipi', xml: '1.5000', catalogo: '1.5000' }),
      ])
    )
  })
})
