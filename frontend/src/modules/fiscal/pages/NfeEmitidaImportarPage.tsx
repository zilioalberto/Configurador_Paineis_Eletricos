import { type ChangeEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import {
  importarDocumentoEmitidoManual,
  importarLoteDocumentosEmitidos,
} from '../services/fiscalNfeService'

/** Importação de XMLs emitidos (único ou em lote) com classificação automática por CFOP. */
export default function NfeEmitidaImportarPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [arquivosNomes, setArquivosNomes] = useState<string[]>([])
  const [xmlLote, setXmlLote] = useState<string[]>([])
  const [xml, setXml] = useState('')
  const [enviando, setEnviando] = useState(false)

  const onArquivosChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    const nomes: string[] = []
    const textos: string[] = []
    for (const file of Array.from(files)) {
      nomes.push(file.name)
      textos.push(await file.text())
    }
    setArquivosNomes(nomes)
    setXmlLote(textos)
    setXml(files.length === 1 ? (textos[0] ?? '') : '')
    event.target.value = ''
  }

  const importar = async () => {
    setEnviando(true)
    try {
      if (xmlLote.length > 1) {
        const resultado = await importarLoteDocumentosEmitidos(xmlLote)
        showToast({
          variant: resultado.erros ? 'warning' : 'success',
          title: 'Importação em lote',
          message: `${resultado.criados} novo(s), ${resultado.duplicados} duplicado(s), ${resultado.erros} erro(s).`,
        })
        navigate(fiscalPaths.nfesEmitidas)
        return
      }

      const texto = xml.trim()
      if (!texto) {
        showToast({ variant: 'warning', title: 'Informe ou selecione um XML' })
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

  const podeImportar =
    !enviando && (xml.trim().length > 0 || xmlLote.length > 0)

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
            Selecione um ou vários arquivos XML de NF-e ou NFS-e. O sistema detecta o tipo,
            classifica por CFOP (revenda → Anexo I, industrialização → II, serviços → Fator R) e
            alimenta a projeção de DAS.
          </p>

          <div className="card">
            <div className="card-body">
              <div className="mb-3">
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
                {arquivosNomes.length > 0 ? (
                  <div className="form-text">
                    {arquivosNomes.length} arquivo(s): {arquivosNomes.join(', ')}
                  </div>
                ) : null}
              </div>

              {arquivosNomes.length <= 1 ? (
                <div className="mb-3">
                  <label className="form-label" htmlFor="xml-emitido-texto">
                    Ou cole o XML
                  </label>
                  <textarea
                    id="xml-emitido-texto"
                    className="form-control font-monospace"
                    rows={10}
                    value={xml}
                    onChange={(e) => setXml(e.target.value)}
                    placeholder="<nfeProc>...</nfeProc>"
                  />
                </div>
              ) : (
                <p className="text-muted small">
                  Modo lote: {arquivosNomes.length} arquivos serão enviados juntos.
                </p>
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
