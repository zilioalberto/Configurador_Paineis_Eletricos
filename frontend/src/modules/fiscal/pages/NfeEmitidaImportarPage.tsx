import { type ChangeEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import { useFiscalConfigQuery } from '../hooks/useFiscalConfigQuery'
import {
  importarDocumentoEmitidoManual,
  importarLoteDocumentosEmitidos,
} from '../services/fiscalNfeService'
import { formatCnpjExibicao, formatDataIso, formatMoedaBrl } from '../utils/fiscalDisplay'
import { validarXmlEmitidoParaImportacao } from '../utils/validarXmlEmitido'

type XmlResumo = {
  readonly tipo: string
  readonly numero: string
  readonly emissao: string
  readonly cliente: string
  readonly valor: string
}

type XmlItem = {
  readonly numero: string
  readonly codigo: string
  readonly descricao: string
  readonly ncm: string
  readonly cfop: string
  readonly unidade: string
  readonly quantidade: string
  readonly valor_unitario: string
  readonly valor_total: string
}

type XmlVisualizacao = XmlResumo & {
  readonly serie: string
  readonly natureza: string
  readonly chave: string
  readonly emitente: string
  readonly cnpj_emitente: string
  readonly cliente: string
  readonly cnpj_cliente: string
  readonly base_icms: string
  readonly valor_icms: string
  readonly valor_produtos: string
  readonly valor_desconto: string
  readonly valor_frete: string
  readonly valor_total: string
  readonly itens: XmlItem[]
}

type XmlArquivoSelecionado = {
  readonly nome: string
  readonly caminho: string
  readonly tamanho: number
  readonly xml: string
  readonly visualizacao: XmlVisualizacao
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function localName(el: Element): string {
  return el.localName || el.tagName
}

function filhos(element: Element, nome: string): Element[] {
  return Array.from(element.children).filter((child) => localName(child) === nome)
}

function filho(element: Element, nome: string): Element | null {
  return filhos(element, nome)[0] ?? null
}

function textoFilho(element: Element | null, nomes: string[]): string {
  if (!element) return ''
  for (const nome of nomes) {
    const child = filho(element, nome)
    if (child?.textContent?.trim()) return child.textContent.trim()
  }
  return ''
}

function textoDescendente(element: Element | Document, nomes: string[]): string {
  const root = element instanceof Document ? element.documentElement : element
  for (const el of Array.from(root.getElementsByTagName('*'))) {
    if (nomes.includes(localName(el)) && el.textContent?.trim()) {
      return el.textContent.trim()
    }
  }
  return ''
}

function grupoDescendente(element: Element | Document, nomes: string[]): Element | null {
  const root = element instanceof Document ? element.documentElement : element
  for (const el of Array.from(root.getElementsByTagName('*'))) {
    if (nomes.includes(localName(el))) return el
  }
  return null
}

function participanteNfe(doc: Document, grupoNome: 'emit' | 'dest') {
  const grupo = grupoDescendente(doc, [grupoNome])
  return {
    nome: textoFilho(grupo, ['xNome']),
    cnpj: textoFilho(grupo, ['CNPJ', 'CPF']),
  }
}

function itemProduto(det: Element): XmlItem {
  const prod = filho(det, 'prod')
  return {
    numero: det.getAttribute('nItem') || textoFilho(det, ['NumeroItem']) || '',
    codigo: textoFilho(prod, ['cProd', 'Codigo']),
    descricao: textoFilho(prod, ['xProd', 'Descricao']),
    ncm: textoFilho(prod, ['NCM']),
    cfop: textoFilho(prod, ['CFOP']),
    unidade: textoFilho(prod, ['uCom', 'Unidade']),
    quantidade: textoFilho(prod, ['qCom', 'Quantidade']),
    valor_unitario: textoFilho(prod, ['vUnCom', 'ValorUnitario']),
    valor_total: textoFilho(prod, ['vProd', 'ValorTotal']),
  }
}

function itensNfeProduto(doc: Document): XmlItem[] {
  return Array.from(doc.getElementsByTagName('*'))
    .filter((el) => localName(el) === 'det')
    .map(itemProduto)
}

function itensNfse(doc: Document): XmlItem[] {
  const descricao = textoDescendente(doc, ['Discriminacao', 'Descricao'])
  if (!descricao) return []
  return [
    {
      numero: '1',
      codigo: textoDescendente(doc, ['CodigoItemListaServico', 'ItemListaServico']),
      descricao,
      ncm: '',
      cfop: '',
      unidade: 'SV',
      quantidade: '1',
      valor_unitario: textoDescendente(doc, ['ValorServicos', 'ValorLiquidoNfse']),
      valor_total: textoDescendente(doc, ['ValorServicos', 'ValorLiquidoNfse']),
    },
  ]
}

function montarVisualizacaoXml(xml: string): XmlVisualizacao {
  const fallback: XmlVisualizacao = {
    tipo: 'XML fiscal',
    numero: 'Não identificado',
    emissao: 'Não identificada',
    cliente: 'Não identificado',
    valor: 'Não identificado',
    serie: '—',
    natureza: '—',
    chave: '',
    emitente: 'Não identificado',
    cnpj_emitente: '',
    cnpj_cliente: '',
    base_icms: '',
    valor_icms: '',
    valor_produtos: '',
    valor_desconto: '',
    valor_frete: '',
    valor_total: 'Não identificado',
    itens: [],
  }
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return fallback
    const rootName = doc.documentElement.localName.toLowerCase()
    const isNfse = rootName.includes('nfse') || xml.toLowerCase().includes('compnfse')
    const ide = grupoDescendente(doc, ['ide', 'IdentificacaoNfse', 'InfDeclaracaoPrestacaoServico'])
    const emit = isNfse
      ? {
          nome: textoDescendente(doc, ['RazaoSocialPrestador', 'NomeFantasiaPrestador', 'RazaoSocial']),
          cnpj: textoDescendente(doc, ['CnpjPrestador', 'Cnpj']),
        }
      : participanteNfe(doc, 'emit')
    const dest = isNfse
      ? {
          nome: textoDescendente(doc, ['RazaoSocialTomador', 'NomeTomador', 'RazaoSocial']),
          cnpj: textoDescendente(doc, ['CnpjTomador', 'CpfCnpjTomador']),
        }
      : participanteNfe(doc, 'dest')
    const total = grupoDescendente(doc, isNfse ? ['ValoresNfse', 'Valores'] : ['ICMSTot'])
    const valorTotal = isNfse
      ? textoDescendente(doc, ['ValorLiquidoNfse', 'ValorServicos'])
      : textoFilho(total, ['vNF'])

    return {
      tipo: isNfse ? 'NFS-e de serviço' : 'NF-e de produto',
      numero: (isNfse ? textoDescendente(doc, ['Numero', 'NumeroNfse']) : textoFilho(ide, ['nNF'])) || fallback.numero,
      emissao:
        (isNfse ? textoDescendente(doc, ['DataEmissao']) : textoFilho(ide, ['dhEmi', 'dEmi'])).slice(0, 10) ||
        fallback.emissao,
      cliente: dest.nome || fallback.cliente,
      valor: valorTotal || fallback.valor,
      serie: (isNfse ? textoDescendente(doc, ['Serie']) : textoFilho(ide, ['serie'])) || '—',
      natureza: (isNfse ? textoDescendente(doc, ['Discriminacao']) : textoFilho(ide, ['natOp'])) || '—',
      chave: textoDescendente(doc, ['chNFe']),
      emitente: emit.nome || fallback.emitente,
      cnpj_emitente: emit.cnpj,
      cnpj_cliente: dest.cnpj,
      base_icms: textoFilho(total, ['vBC']),
      valor_icms: textoFilho(total, ['vICMS']),
      valor_produtos: textoFilho(total, ['vProd']) || textoDescendente(doc, ['ValorServicos']),
      valor_desconto: textoFilho(total, ['vDesc']) || textoDescendente(doc, ['DescontoIncondicionado']),
      valor_frete: textoFilho(total, ['vFrete']),
      valor_total: valorTotal || fallback.valor_total,
      itens: isNfse ? itensNfse(doc) : itensNfeProduto(doc),
    }
  } catch {
    return fallback
  }
}

function isArquivoXml(file: File): boolean {
  const nome = file.name.toLowerCase()
  return nome.endsWith('.xml') || file.type === 'application/xml' || file.type === 'text/xml'
}

/** Importação de XMLs emitidos (único ou em lote) com classificação automática por CFOP. */
export default function NfeEmitidaImportarPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: fiscalConfig } = useFiscalConfigQuery()
  const cnpjEmpresa = fiscalConfig?.cnpj_empresa ?? ''
  const [arquivos, setArquivos] = useState<XmlArquivoSelecionado[]>([])
  const [arquivoAtivo, setArquivoAtivo] = useState(0)
  const [enviando, setEnviando] = useState(false)

  const carregarArquivos = async (fileList: FileList, origem: 'arquivos' | 'pasta') => {
    const files = Array.from(fileList)
    const xmlFiles = files.filter(isArquivoXml)
    if (!xmlFiles.length) {
      showToast({
        variant: 'warning',
        title: origem === 'pasta' ? 'Pasta sem XML' : 'Nenhum XML selecionado',
        message: 'Selecione arquivos com extensão .xml para importar.',
      })
      return
    }

    const ignorados = files.length - xmlFiles.length
    const selecionados: XmlArquivoSelecionado[] = []
    const rejeitados: string[] = []
    for (const file of xmlFiles) {
      const xml = await file.text()
      const visualizacao = montarVisualizacaoXml(xml)
      const validacao = validarXmlEmitidoParaImportacao(xml, cnpjEmpresa, visualizacao.cnpj_emitente)
      if (!validacao.valido) {
        rejeitados.push(`${file.name}: ${validacao.motivo}`)
        continue
      }
      selecionados.push({
        nome: file.name,
        caminho: file.webkitRelativePath || file.name,
        tamanho: file.size,
        xml,
        visualizacao,
      })
    }
    selecionados.sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'))
    setArquivos(selecionados)
    setArquivoAtivo(0)

    if (ignorados > 0) {
      showToast({
        variant: 'warning',
        title: 'Arquivos ignorados',
        message: `${ignorados} arquivo(s) da ${origem} não eram XML e foram ignorados.`,
      })
    }
    if (rejeitados.length > 0) {
      showToast({
        variant: 'danger',
        title: 'XMLs rejeitados',
        message:
          rejeitados.length === 1
            ? rejeitados[0]
            : `${rejeitados.length} arquivo(s) não são emitidos pela ZFW ou são inválidos.`,
      })
    }
  }

  const onArquivosChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    await carregarArquivos(files, 'arquivos')
    event.target.value = ''
  }

  const onPastaChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    await carregarArquivos(files, 'pasta')
    event.target.value = ''
  }

  const importar = async () => {
    setEnviando(true)
    try {
      if (arquivos.length > 1) {
        const resultado = await importarLoteDocumentosEmitidos(arquivos.map((a) => a.xml))
        showToast({
          variant: resultado.erros ? 'warning' : 'success',
          title: 'Importação em lote',
          message: `${resultado.criados} novo(s), ${resultado.duplicados} duplicado(s), ${resultado.erros} erro(s).`,
        })
        navigate(fiscalPaths.nfesEmitidas)
        return
      }

      const texto = arquivos[0]?.xml.trim() ?? ''
      if (!texto) {
        showToast({
          variant: 'warning',
          title: 'Selecione um XML',
          message: 'Escolha ao menos um arquivo XML para importar.',
        })
        return
      }
      const result = await importarDocumentoEmitidoManual({ xml: texto })
      showToast({
        variant: result.created ? 'success' : 'warning',
        title: 'Documento emitido',
        message: result.created ? 'XML importado com classificação por CFOP.' : result.message,
      })
      navigate(fiscalPaths.nfesEmitidas)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Importação de saída',
        message: extrairMensagemErroApi(err) || 'Não foi possível importar.',
      })
    } finally {
      setEnviando(false)
    }
  }

  const arquivoPreview = arquivos[arquivoAtivo]
  const podeImportar = !enviando && arquivos.length > 0

  return (
    <div className="container-fluid">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.nfesEmitidas}>NF-es emitidas</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Importar saídas
          </li>
        </ol>
      </nav>

      <div className="row">
        <div className="col-lg-9 col-xl-8">
          <h1 className="h3 mb-2">Importar XMLs emitidos</h1>
          <p className="text-muted">
            Selecione arquivos XML de NF-e ou NFS-e emitidos pela ZFW, ou carregue uma pasta
            inteira. Notas de fornecedores (entrada) devem ser importadas em NF-es recebidas.
          </p>
          {cnpjEmpresa ? (
            <p className="small text-muted mb-0">
              CNPJ emitente esperado: <strong>{formatCnpjExibicao(cnpjEmpresa)}</strong>
            </p>
          ) : null}

          <div className="card">
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="xml-emitido-files">
                    Arquivos XML (um ou vários)
                  </label>
                  <input
                    id="xml-emitido-files"
                    type="file"
                    className="form-control"
                    accept=".xml,application/xml,text/xml"
                    multiple
                    onChange={onArquivosChange}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="xml-emitido-folder">
                    Pasta com XMLs
                  </label>
                  <input
                    id="xml-emitido-folder"
                    type="file"
                    className="form-control"
                    accept=".xml,application/xml,text/xml"
                    multiple
                    onChange={onPastaChange}
                    {...{ webkitdirectory: '', directory: '' }}
                  />
                </div>
              </div>

              {arquivos.length === 0 ? (
                <div className="border rounded p-4 text-center text-muted mb-3">
                  Nenhum XML selecionado ainda.
                </div>
              ) : (
                <div className="row g-3 mb-3">
                  <div className="col-lg-5">
                    <div className="list-group">
                      {arquivos.map((arquivo, index) => (
                        <button
                          key={`${arquivo.nome}-${index}`}
                          type="button"
                          className={`list-group-item list-group-item-action ${index === arquivoAtivo ? 'active' : ''}`}
                          onClick={() => setArquivoAtivo(index)}
                        >
                          <div className="d-flex justify-content-between gap-2">
                            <span className="text-truncate">{arquivo.nome}</span>
                            <small>{formatBytes(arquivo.tamanho)}</small>
                          </div>
                          {arquivo.caminho === arquivo.nome ? null : (
                            <small className="d-block text-truncate">{arquivo.caminho}</small>
                          )}
                          <small>{arquivo.visualizacao.tipo}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-lg-7">
                    {arquivoPreview ? (
                      <div className="border rounded p-3 h-100">
                        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                          <div>
                            <h2 className="h5 mb-1">
                              {arquivoPreview.visualizacao.tipo} {arquivoPreview.visualizacao.numero}
                            </h2>
                            <div className="small text-muted">
                              Série {arquivoPreview.visualizacao.serie} · Emissão{' '}
                              {formatDataIso(arquivoPreview.visualizacao.emissao)}
                            </div>
                          </div>
                          <span className="badge text-bg-light">{arquivos.length} arquivo(s)</span>
                        </div>

                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <div className="small text-muted">Emitente</div>
                            <div className="fw-semibold">{arquivoPreview.visualizacao.emitente}</div>
                            <div className="small">{formatCnpjExibicao(arquivoPreview.visualizacao.cnpj_emitente)}</div>
                          </div>
                          <div className="col-md-6">
                            <div className="small text-muted">Cliente / destinatário</div>
                            <div className="fw-semibold">{arquivoPreview.visualizacao.cliente}</div>
                            <div className="small">{formatCnpjExibicao(arquivoPreview.visualizacao.cnpj_cliente)}</div>
                          </div>
                          <div className="col-12">
                            <div className="small text-muted">Natureza / discriminação</div>
                            <div>{arquivoPreview.visualizacao.natureza}</div>
                          </div>
                        </div>

                        <div className="row g-2 mb-3">
                          <div className="col-6 col-md-4">
                            <div className="border rounded p-2 h-100">
                              <div className="small text-muted">Total da nota</div>
                              <div className="fw-semibold">{formatMoedaBrl(arquivoPreview.visualizacao.valor_total)}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-4">
                            <div className="border rounded p-2 h-100">
                              <div className="small text-muted">Produtos/serviços</div>
                              <div>{formatMoedaBrl(arquivoPreview.visualizacao.valor_produtos)}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-4">
                            <div className="border rounded p-2 h-100">
                              <div className="small text-muted">Desconto</div>
                              <div>{formatMoedaBrl(arquivoPreview.visualizacao.valor_desconto || '0')}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-4">
                            <div className="border rounded p-2 h-100">
                              <div className="small text-muted">Frete</div>
                              <div>{formatMoedaBrl(arquivoPreview.visualizacao.valor_frete || '0')}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-4">
                            <div className="border rounded p-2 h-100">
                              <div className="small text-muted">Base ICMS</div>
                              <div>{formatMoedaBrl(arquivoPreview.visualizacao.base_icms)}</div>
                            </div>
                          </div>
                          <div className="col-6 col-md-4">
                            <div className="border rounded p-2 h-100">
                              <div className="small text-muted">ICMS</div>
                              <div>{formatMoedaBrl(arquivoPreview.visualizacao.valor_icms)}</div>
                            </div>
                          </div>
                        </div>

                        <h3 className="h6">Itens ({arquivoPreview.visualizacao.itens.length})</h3>
                        {arquivoPreview.visualizacao.itens.length ? (
                          <div className="table-responsive mb-3" style={{ maxHeight: 260 }}>
                            <table className="table table-sm align-middle mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>#</th>
                                  <th>Descrição</th>
                                  <th>CFOP</th>
                                  <th className="text-end">Qtd</th>
                                  <th className="text-end">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {arquivoPreview.visualizacao.itens.map((item, index) => (
                                  <tr key={`${item.numero}-${item.codigo}-${index}`}>
                                    <td>{item.numero || index + 1}</td>
                                    <td>
                                      <div className="fw-semibold">{item.descricao || '—'}</div>
                                      <div className="small text-muted">
                                        {item.codigo || 'Sem código'} · NCM {item.ncm || '—'} · {item.unidade || '—'}
                                      </div>
                                    </td>
                                    <td>{item.cfop || '—'}</td>
                                    <td className="text-end">{item.quantidade || '—'}</td>
                                    <td className="text-end">{formatMoedaBrl(item.valor_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-muted small">Nenhum item identificado nesta prévia.</p>
                        )}

                        <details className="small">
                          <summary>Ver XML original</summary>
                          <pre className="bg-light border rounded p-2 mt-2 mb-0" style={{ maxHeight: 160, overflow: 'auto' }}>
                            {arquivoPreview.xml.slice(0, 1200)}
                          </pre>
                        </details>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!podeImportar}
                  onClick={() => void importar()}
                >
                  {enviando ? 'Importando…' : 'Importar'}
                </button>
                <Link to={fiscalPaths.nfesEmitidas} className="btn btn-outline-secondary">
                  Voltar à lista
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
