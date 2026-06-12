import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react'
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

type XmlArquivoSelecionado = {
  readonly nome: string
  readonly caminho: string
  readonly tamanho: number
  readonly xml: string
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
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [arquivos, setArquivos] = useState<XmlArquivoSelecionado[]>([])
  const [arquivoAtivo, setArquivoAtivo] = useState(0)
  const [importandoLote, setImportandoLote] = useState(false)
  const [objetivoEntrada, setObjetivoEntrada] = useState<ObjetivoEntradaFiscal | ''>('')
  const [revisarCatalogoAposImportar, setRevisarCatalogoAposImportar] = useState(false)

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
      showToast({ variant: 'success', message: result.message })
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

  const carregarArquivos = useCallback(
    async (fileList: FileList, origem: 'arquivos' | 'pasta') => {
      const files = Array.from(fileList)
      const xmlFiles = files.filter(isArquivoXml)
      if (!xmlFiles.length) {
        showToast({
          variant: 'warning',
          message: 'Selecione arquivos com extensão .xml para importar.',
        })
        return
      }

      const selecionados: XmlArquivoSelecionado[] = []
      const rejeitados: string[] = []
      for (const file of xmlFiles) {
        const conteudo = (await file.text()).trim()
        const validacao = validarXmlRecebidoParaImportacao(conteudo, cnpjEmpresa)
        if (!validacao.valido) {
          rejeitados.push(`${file.name}: ${validacao.motivo}`)
          continue
        }
        selecionados.push({
          nome: file.name,
          caminho: file.webkitRelativePath || file.name,
          tamanho: file.size,
          xml: conteudo,
        })
      }
      selecionados.sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'))
      setArquivos(selecionados)
      setArquivoAtivo(0)
      setNomeArquivo(selecionados.length === 1 ? selecionados[0].nome : '')
      setXml(selecionados.length === 1 ? selecionados[0].xml : '')

      const ignorados = files.length - xmlFiles.length
      if (ignorados > 0) {
        showToast({
          variant: 'warning',
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
              : `${rejeitados.length} arquivo(s) não são destinados à ZFW ou são inválidos.`,
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
    let sucesso = 0
    let erros = 0
    try {
      for (const arquivo of arquivos) {
        try {
          await importarNfeXmlManual({
            xml: arquivo.xml,
            cnpj_destinatario: cnpjDest.replace(/\D/g, '') || undefined,
            objetivo_entrada: objetivoEntrada,
          })
          sucesso += 1
        } catch {
          erros += 1
        }
      }
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all })
      showToast({
        variant: erros ? 'warning' : 'success',
        message: `${sucesso} XML(s) importado(s), ${erros} erro(s).`,
      })
      navigate(fiscalPaths.nfes)
    } finally {
      setImportandoLote(false)
    }
  }, [arquivos, cnpjDest, navigate, objetivoEntrada, queryClient, showToast])

  const validarXmlAntesEnvio = useCallback(
    (conteudo: string): boolean => {
      const validacao = validarXmlRecebidoParaImportacao(conteudo, cnpjEmpresa)
      if (!validacao.valido) {
        showToast({
          variant: 'danger',
          title: 'XML rejeitado',
          message: validacao.motivo,
        })
        return false
      }
      return true
    },
    [cnpjEmpresa, showToast],
  )

  const onSubmit = useCallback(
    (e: FormEvent) => {
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
    [
      arquivos,
      importarLote,
      mutation,
      objetivoEntrada,
      showToast,
      validarXmlAntesEnvio,
      xml,
    ],
  )

  const arquivoPreview = arquivos[arquivoAtivo]
  const isLote = arquivos.length > 1
  const importando = mutation.isPending || importandoLote

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
        Grava a NF-e no servidor com itens parseados e XML original. Duplicatas pela chave de 44
        dígitos são ignoradas com aviso. A sincronização automática com a SEFAZ será feita pela
        futura ponte A3; aqui o envio é manual.
      </p>
      {cnpjEmpresa ? (
        <p className="small text-muted mb-4">
          CNPJ destinatário esperado: <strong>{formatCnpjExibicao(cnpjEmpresa)}</strong>
        </p>
      ) : (
        <p className="text-muted mb-4" />
      )}

      <div className="alert alert-info small" role="status">
        Você pode registrar a NF-e no Fiscal e, em seguida, revisar quais itens entram no{' '}
        <strong>catálogo de produtos</strong>. Também é possível abrir esse fluxo depois pelo detalhe
        da nota.
      </div>

      <form onSubmit={onSubmit} className="card border-0 shadow-sm">
        <div className="card-body p-4 d-flex flex-column gap-3">
          <div className="row g-3">
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
              {nomeArquivo ? (
                <p className="form-text mb-0 mt-1">Ficheiro: {nomeArquivo}</p>
              ) : null}
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
              <div className="form-text">Importa todos os XMLs encontrados na pasta selecionada.</div>
            </div>
          </div>

          {arquivos.length > 0 ? (
            <div className="border rounded p-3">
              <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                <strong>{arquivos.length} XML(s) selecionado(s)</strong>
                {isLote ? <span className="badge text-bg-light">Modo lote</span> : null}
              </div>
              <div className="list-group mb-3" style={{ maxHeight: '12rem', overflow: 'auto' }}>
                {arquivos.map((arquivo, index) => (
                  <button
                    key={`${arquivo.caminho}-${index}`}
                    type="button"
                    className={`list-group-item list-group-item-action ${index === arquivoAtivo ? 'active' : ''}`}
                    onClick={() => setArquivoAtivo(index)}
                  >
                    <div className="d-flex justify-content-between gap-2">
                      <span className="text-truncate">{arquivo.nome}</span>
                      <small>{formatBytes(arquivo.tamanho)}</small>
                    </div>
                    {arquivo.caminho !== arquivo.nome ? (
                      <small className="d-block text-truncate">{arquivo.caminho}</small>
                    ) : null}
                  </button>
                ))}
              </div>
              {arquivoPreview ? (
                <pre className="bg-light border rounded p-2 small mb-0" style={{ maxHeight: 140, overflow: 'auto' }}>
                  {arquivoPreview.xml.slice(0, 1200)}
                </pre>
              ) : null}
            </div>
          ) : null}

          {!isLote ? (
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
                  setNomeArquivo('')
                }}
                placeholder="&lt;nfeProc&gt;…"
                spellCheck={false}
              />
            </div>
          ) : null}

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
                Classifica a finalidade fiscal da entrada para consultas e conferência posterior.
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

          {!isLote ? (
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
          ) : (
            <div className="alert alert-secondary small mb-0">
              Em lote, os XMLs são registrados apenas no Fiscal. Para catalogar produtos, abra uma
              NF-e importada e use <strong>Importar itens no catálogo</strong>.
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={importando || (!xml.trim() && arquivos.length === 0) || !objetivoEntrada}
            >
              {importando ? 'A importar…' : isLote ? `Importar ${arquivos.length} XMLs` : 'Importar'}
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
