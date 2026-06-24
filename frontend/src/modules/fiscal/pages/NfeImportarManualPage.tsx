import {
  type ChangeEvent,
  type DragEvent,
  type SyntheticEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { catalogoPaths } from '@/modules/catalogo/catalogoPaths'
import { aplicarMascaraCnpj } from '@/modules/cadastros/utils/cnpjMask'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { objetivoEntradaOptions } from '../constants/objetivoEntradaOptions'
import { useFiscalConfigQuery } from '../hooks/useFiscalConfigQuery'
import { importarNfeXmlManual } from '../services/fiscalNfeService'
import type { ObjetivoEntradaFiscal } from '../types/documentoFiscalRecebido'
import { formatCnpjExibicao } from '../utils/fiscalDisplay'
import { validarXmlRecebidoParaImportacao } from '../utils/validarXmlRecebido'

function rotuloBotaoImportarXml(importando: boolean, isLote: boolean, quantidade: number): string {
  if (importando) return 'A importar…'
  if (isLote) return `Importar ${quantidade} XMLs`
  return 'Importar'
}

type ResultadoStatus = 'pendente' | 'enviando' | 'novo' | 'duplicado' | 'erro'

type XmlArquivoSelecionado = {
  readonly id: string
  readonly nome: string
  readonly caminho: string
  readonly tamanho: number
  readonly xml: string
}

type ArquivoRejeitado = {
  readonly id: string
  readonly nome: string
  readonly motivo: string
}

type ResultadoLote = {
  readonly status: ResultadoStatus
  readonly mensagem?: string
}

let _uidSeq = 0
function uid(): string {
  _uidSeq += 1
  return `xml-${Date.now().toString(36)}-${_uidSeq}`
}

function isArquivoXml(file: File): boolean {
  const nome = file.name.toLowerCase()
  return nome.endsWith('.xml') || file.type === 'application/xml' || file.type === 'text/xml'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function BadgeResultado({ status }: Readonly<{ status?: ResultadoStatus }>) {
  switch (status) {
    case 'enviando':
      return <span className="badge text-bg-info">Enviando…</span>
    case 'novo':
      return <span className="badge text-bg-success">Importado</span>
    case 'duplicado':
      return <span className="badge text-bg-secondary">Duplicado</span>
    case 'erro':
      return <span className="badge text-bg-danger">Erro</span>
    case 'pendente':
      return <span className="badge text-bg-light text-muted">Na fila</span>
    default:
      return null
  }
}

async function lerArquivosXml(
  xmlFiles: File[],
  cnpjEmpresa: string,
): Promise<{ selecionados: XmlArquivoSelecionado[]; rejeitados: ArquivoRejeitado[] }> {
  const selecionados: XmlArquivoSelecionado[] = []
  const rejeitados: ArquivoRejeitado[] = []
  for (const file of xmlFiles) {
    const conteudo = (await file.text()).trim()
    const validacao = validarXmlRecebidoParaImportacao(conteudo, cnpjEmpresa)
    if (!validacao.valido) {
      rejeitados.push({ id: uid(), nome: file.name, motivo: validacao.motivo })
      continue
    }
    selecionados.push({
      id: uid(),
      nome: file.name,
      caminho: file.webkitRelativePath || file.name,
      tamanho: file.size,
      xml: conteudo,
    })
  }
  selecionados.sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'))
  return { selecionados, rejeitados }
}

async function importarArquivosEmLote(
  arquivos: readonly XmlArquivoSelecionado[],
  cnpjDest: string,
  objetivoEntrada: ObjetivoEntradaFiscal,
  cb: {
    onResultado: (id: string, resultado: ResultadoLote) => void
    onProgresso: (atual: number) => void
  },
): Promise<{ novos: number; duplicados: number; erros: number }> {
  let novos = 0
  let duplicados = 0
  let erros = 0
  for (let i = 0; i < arquivos.length; i += 1) {
    const arquivo = arquivos[i]
    cb.onResultado(arquivo.id, { status: 'enviando' })
    try {
      const r = await importarNfeXmlManual({
        xml: arquivo.xml,
        cnpj_destinatario: cnpjDest.replace(/\D/g, '') || undefined,
        objetivo_entrada: objetivoEntrada,
      })
      if (r.created) {
        novos += 1
        cb.onResultado(arquivo.id, { status: 'novo', mensagem: r.message })
      } else {
        duplicados += 1
        cb.onResultado(arquivo.id, { status: 'duplicado', mensagem: r.message })
      }
    } catch (err) {
      erros += 1
      cb.onResultado(arquivo.id, {
        status: 'erro',
        mensagem: extrairMensagemErroApi(err) || 'Falha ao importar este XML.',
      })
    }
    cb.onProgresso(i + 1)
  }
  return { novos, duplicados, erros }
}

/** Envio de XML para o armazenamento fiscal (NF-e recebida no servidor). */
export default function NfeImportarManualPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { data: fiscalConfig } = useFiscalConfigQuery()
  const cnpjEmpresa = fiscalConfig?.cnpj_empresa ?? ''

  const [xml, setXml] = useState('')
  const [cnpjDest, setCnpjDest] = useState('')
  const [nsu, setNsu] = useState('')
  const [arquivos, setArquivos] = useState<XmlArquivoSelecionado[]>([])
  const [rejeitados, setRejeitados] = useState<ArquivoRejeitado[]>([])
  const [arquivoAtivo, setArquivoAtivo] = useState(0)
  const [importandoLote, setImportandoLote] = useState(false)
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null)
  const [resultados, setResultados] = useState<Record<string, ResultadoLote>>({})
  const [loteConcluido, setLoteConcluido] = useState(false)
  const [dragAtivo, setDragAtivo] = useState(false)
  const [objetivoEntrada, setObjetivoEntrada] = useState<ObjetivoEntradaFiscal | ''>('')
  const [revisarCatalogoAposImportar, setRevisarCatalogoAposImportar] = useState(false)

  const isLote = arquivos.length > 1

  const mutation = useMutation({
    mutationFn: () =>
      importarNfeXmlManual({
        xml,
        cnpj_destinatario: cnpjDest.replace(/\D/g, '') || undefined,
        nsu: nsu.replace(/\D/g, '') || undefined,
        objetivo_entrada: objetivoEntrada || undefined,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all })
      showToast({
        variant: result.created ? 'success' : 'warning',
        message: result.message,
      })
      if (revisarCatalogoAposImportar) {
        navigate(`${catalogoPaths.produtoImportarNfe}?documentoFiscalId=${result.documento_id}`)
        return
      }
      navigate(fiscalPaths.nfeDetalhe(result.documento_id))
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        message: extrairMensagemErroApi(err) || 'Não foi possível importar o XML.',
      })
    },
  })

  const limparSelecao = useCallback(() => {
    setArquivos([])
    setRejeitados([])
    setResultados({})
    setProgresso(null)
    setLoteConcluido(false)
    setArquivoAtivo(0)
    setXml('')
  }, [])

  const removerArquivo = useCallback((id: string) => {
    setArquivos((atual) => atual.filter((a) => a.id !== id))
    setResultados((atual) => {
      const { [id]: _omit, ...resto } = atual
      return resto
    })
    setArquivoAtivo(0)
    setLoteConcluido(false)
  }, [])

  const carregarArquivos = useCallback(
    async (fileList: FileList | File[], origem: 'arquivos' | 'pasta') => {
      const files = Array.from(fileList)
      const xmlFiles = files.filter(isArquivoXml)
      if (!xmlFiles.length) {
        showToast({
          variant: 'warning',
          message: 'Selecione arquivos com extensão .xml para importar.',
        })
        return
      }

      const { selecionados, rejeitados: novosRejeitados } = await lerArquivosXml(xmlFiles, cnpjEmpresa)
      setArquivos(selecionados)
      setRejeitados(novosRejeitados)
      setResultados({})
      setProgresso(null)
      setLoteConcluido(false)
      setArquivoAtivo(0)
      setXml(selecionados.length === 1 ? selecionados[0].xml : '')

      const ignorados = files.length - xmlFiles.length
      if (ignorados > 0) {
        showToast({
          variant: 'warning',
          message: `${ignorados} arquivo(s) da ${origem} não eram XML e foram ignorados.`,
        })
      }
    },
    [cnpjEmpresa, showToast],
  )

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return
      await carregarArquivos(files, 'arquivos')
      e.target.value = ''
    },
    [carregarArquivos],
  )

  const onFolderChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return
      await carregarArquivos(files, 'pasta')
      e.target.value = ''
    },
    [carregarArquivos],
  )

  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragAtivo(false)
      const files = e.dataTransfer?.files
      if (!files?.length) return
      await carregarArquivos(files, 'arquivos')
    },
    [carregarArquivos],
  )

  const importarLote = useCallback(async () => {
    if (!objetivoEntrada) {
      showToast({ variant: 'danger', message: 'Informe o objetivo da entrada da NF-e.' })
      return
    }
    if (!arquivos.length) {
      showToast({ variant: 'danger', message: 'Selecione arquivos XML para importar.' })
      return
    }

    setImportandoLote(true)
    setLoteConcluido(false)
    setProgresso({ atual: 0, total: arquivos.length })
    setResultados(Object.fromEntries(arquivos.map((a) => [a.id, { status: 'pendente' as const }])))

    try {
      const { novos, duplicados, erros } = await importarArquivosEmLote(
        arquivos,
        cnpjDest,
        objetivoEntrada,
        {
          onResultado: (id, resultado) => setResultados((prev) => ({ ...prev, [id]: resultado })),
          onProgresso: (atual) => setProgresso({ atual, total: arquivos.length }),
        },
      )
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all })
      setLoteConcluido(true)
      showToast({
        variant: erros ? 'warning' : 'success',
        message: `${novos} nova(s), ${duplicados} duplicada(s), ${erros} com erro.`,
      })
    } finally {
      setImportandoLote(false)
    }
  }, [arquivos, cnpjDest, objetivoEntrada, queryClient, showToast])

  const validarXmlAntesEnvio = useCallback(
    (conteudo: string): boolean => {
      const validacao = validarXmlRecebidoParaImportacao(conteudo, cnpjEmpresa)
      if (!validacao.valido) {
        showToast({ variant: 'danger', title: 'XML rejeitado', message: validacao.motivo })
        return false
      }
      return true
    },
    [cnpjEmpresa, showToast],
  )

  const onSubmit = useCallback(
    (e: SyntheticEvent) => {
      e.preventDefault()
      if (!xml.trim() && arquivos.length === 0) {
        showToast({ variant: 'danger', message: 'Selecione ou cole o conteúdo do XML da NF-e.' })
        return
      }
      if (!objetivoEntrada) {
        showToast({ variant: 'danger', message: 'Informe o objetivo da entrada da NF-e.' })
        return
      }
      if (arquivos.length > 1) {
        void importarLote()
        return
      }
      const conteudo = arquivos[0]?.xml.trim() || xml.trim()
      if (!validarXmlAntesEnvio(conteudo)) return
      mutation.mutate()
    },
    [arquivos, importarLote, mutation, objetivoEntrada, showToast, validarXmlAntesEnvio, xml],
  )

  const arquivoPreview = arquivos[arquivoAtivo]
  const importando = mutation.isPending || importandoLote
  const totalResumo = useMemo(() => {
    const valores = Object.values(resultados)
    return {
      novos: valores.filter((r) => r.status === 'novo').length,
      duplicados: valores.filter((r) => r.status === 'duplicado').length,
      erros: valores.filter((r) => r.status === 'erro').length,
    }
  }, [resultados])

  return (
    <div className="container-fluid" style={{ maxWidth: '48rem' }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.nfes}>NF-es recebidas</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Importar XML
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Importar XML (armazenamento fiscal)</h1>
      <p className="text-muted mb-2">
        Grava a NF-e no servidor com itens parseados e XML original. Duplicatas (mesma chave de 44
        dígitos) são ignoradas com aviso. Pode enviar um único XML ou vários de uma vez.
      </p>
      {cnpjEmpresa ? (
        <p className="small text-muted mb-4">
          CNPJ destinatário esperado: <strong>{formatCnpjExibicao(cnpjEmpresa)}</strong>
        </p>
      ) : (
        <p className="text-muted mb-4" />
      )}

      <form onSubmit={onSubmit} className="card border-0 shadow-sm">
        <div className="card-body p-4 d-flex flex-column gap-3">
          <div
            className={`border rounded p-4 text-center ${dragAtivo ? 'border-primary bg-primary-subtle' : 'border-2 border-dashed bg-light'}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragAtivo(true)
            }}
            onDragLeave={() => setDragAtivo(false)}
            onDrop={onDrop}
          >
            <p className="mb-3 text-muted small">
              Arraste os XMLs para cá ou selecione abaixo.
            </p>
            <div className="row g-3 text-start">
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="nfe-xml-arquivo">
                  Arquivos XML
                </label>
                <input
                  id="nfe-xml-arquivo"
                  type="file"
                  className="form-control"
                  accept=".xml,text/xml,application/xml"
                  multiple
                  onChange={onFileChange}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="nfe-xml-pasta">
                  Pasta com XMLs
                </label>
                <input
                  id="nfe-xml-pasta"
                  type="file"
                  className="form-control"
                  accept=".xml,text/xml,application/xml"
                  multiple
                  onChange={onFolderChange}
                  {...{ webkitdirectory: '', directory: '' }}
                />
                <div className="form-text">Importa todos os XMLs encontrados na pasta.</div>
              </div>
            </div>
          </div>

          {rejeitados.length > 0 ? (
            <div className="alert alert-danger mb-0" role="alert">
              <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                <strong>{rejeitados.length} arquivo(s) ignorado(s)</strong>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setRejeitados([])}
                >
                  Dispensar
                </button>
              </div>
              <ul className="small mb-0 ps-3">
                {rejeitados.map((r) => (
                  <li key={r.id}>
                    <strong>{r.nome}</strong>: {r.motivo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {arquivos.length > 0 ? (
            <div className="border rounded p-3">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <strong>{arquivos.length} XML(s) válido(s) selecionado(s)</strong>
                <div className="d-flex gap-2 align-items-center">
                  {isLote ? <span className="badge text-bg-light text-muted">Modo lote</span> : null}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={limparSelecao}
                    disabled={importando}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {progresso ? (
                <div className="mb-2 d-flex align-items-center gap-2">
                  <progress className="flex-grow-1" value={progresso.atual} max={progresso.total} />
                  <small className="text-muted">
                    {progresso.atual}/{progresso.total}
                  </small>
                </div>
              ) : null}

              <div className="list-group mb-3" style={{ maxHeight: '14rem', overflow: 'auto' }}>
                {arquivos.map((arquivo, index) => {
                  const resultado = resultados[arquivo.id]
                  return (
                    <div
                      key={arquivo.id}
                      className={`list-group-item ${index === arquivoAtivo ? 'border-primary' : ''}`}
                    >
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-start text-truncate text-decoration-none"
                          onClick={() => setArquivoAtivo(index)}
                          title={arquivo.caminho}
                        >
                          {arquivo.nome}
                        </button>
                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                          <BadgeResultado status={resultado?.status} />
                          <small className="text-muted">{formatBytes(arquivo.tamanho)}</small>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-1"
                            onClick={() => removerArquivo(arquivo.id)}
                            disabled={importando}
                            aria-label={`Remover ${arquivo.nome}`}
                            title="Remover"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {resultado?.status === 'erro' && resultado.mensagem ? (
                        <div className="small text-danger mt-1">{resultado.mensagem}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {arquivoPreview ? (
                <pre className="bg-light border rounded p-2 small mb-0" style={{ maxHeight: 140, overflow: 'auto' }}>
                  {arquivoPreview.xml.slice(0, 1200)}
                </pre>
              ) : null}
            </div>
          ) : null}

          {loteConcluido ? (
            <output className={`alert ${totalResumo.erros ? 'alert-warning' : 'alert-success'} mb-0 d-block`}>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span>
                  Lote concluído: <strong>{totalResumo.novos}</strong> nova(s),{' '}
                  <strong>{totalResumo.duplicados}</strong> duplicada(s),{' '}
                  <strong>{totalResumo.erros}</strong> com erro.
                </span>
                <Link to={fiscalPaths.nfes} className="btn btn-sm btn-primary">
                  Ver NF-es recebidas
                </Link>
              </div>
            </output>
          ) : null}

          {isLote ? null : (
            <div>
              <label className="form-label" htmlFor="nfe-xml-texto">
                Ou cole o XML
              </label>
              <textarea
                id="nfe-xml-texto"
                className="form-control font-monospace small"
                rows={8}
                value={xml}
                onChange={(e) => {
                  setXml(e.target.value)
                  setArquivos([])
                  setResultados({})
                  setLoteConcluido(false)
                }}
                placeholder="&lt;nfeProc&gt;…"
                spellCheck={false}
              />
            </div>
          )}

          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="nfe-objetivo-entrada">
                Objetivo da entrada
              </label>
              <select
                id="nfe-objetivo-entrada"
                className="form-select"
                value={objetivoEntrada}
                onChange={(e) => setObjetivoEntrada(e.target.value as ObjetivoEntradaFiscal | '')}
                required
              >
                <option value="">Selecione...</option>
                {objetivoEntradaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="form-text">
                Classifica a finalidade fiscal da entrada{isLote ? ' (aplicada a todos os XMLs do lote)' : ''}.
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="nfe-cnpj-dest">
                CNPJ destinatário (opcional)
              </label>
              <input
                id="nfe-cnpj-dest"
                type="text"
                className="form-control"
                value={cnpjDest}
                onChange={(e) => setCnpjDest(aplicarMascaraCnpj(e.target.value))}
                placeholder="Se omitido, usa o dest do XML"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="nfe-nsu">
                NSU (opcional)
              </label>
              <input
                id="nfe-nsu"
                type="text"
                className="form-control font-monospace"
                value={nsu}
                onChange={(e) => setNsu(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="15 dígitos"
                autoComplete="off"
                disabled={isLote}
              />
              {isLote ? (
                <div className="form-text">NSU é usado apenas em importação unitária.</div>
              ) : null}
            </div>
          </div>

          {isLote ? (
            <div className="alert alert-secondary small mb-0">
              Em lote, os XMLs são registrados apenas no Fiscal. Para catalogar produtos, abra uma
              NF-e importada e use <strong>Importar itens no catálogo</strong>.
            </div>
          ) : (
            <div className="form-check border rounded p-3 ps-5 bg-light">
              <input
                id="nfe-revisar-catalogo"
                type="checkbox"
                className="form-check-input"
                checked={revisarCatalogoAposImportar}
                onChange={(e) => setRevisarCatalogoAposImportar(e.target.checked)}
              />
              <label className="form-check-label fw-semibold" htmlFor="nfe-revisar-catalogo">
                Após importar, revisar itens para adicionar ao catálogo
              </label>
              <div className="form-text">
                O sistema salva a NF-e primeiro e abre a revisão de produtos com categoria,
                fornecedor, fabricante e conflitos por código.
              </div>
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={importando || (!xml.trim() && arquivos.length === 0) || !objetivoEntrada}
            >
              {rotuloBotaoImportarXml(importando, isLote, arquivos.length)}
            </button>
            <Link to={fiscalPaths.nfes} className="btn btn-outline-secondary">
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
