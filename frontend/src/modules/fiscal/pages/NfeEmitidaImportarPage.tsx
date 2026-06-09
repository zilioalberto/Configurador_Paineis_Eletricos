import { type ChangeEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { objetivoSaidaOptions } from '../constants/objetivoSaidaOptions'
import { fiscalPaths } from '../fiscalPaths'
import { importarDocumentoEmitidoManual } from '../services/fiscalNfeService'
import type { ObjetivoSaidaFiscal, TipoDocumentoFiscalEmitido } from '../types/documentoFiscalRecebido'

/** Importação manual de XML emitido pela ZFW para relatórios de saídas. */
export default function NfeEmitidaImportarPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [arquivoNome, setArquivoNome] = useState('')
  const [xml, setXml] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFiscalEmitido>('NFE_PRODUTO')
  const [objetivoSaida, setObjetivoSaida] = useState<ObjetivoSaidaFiscal>('VENDA_PRODUTO')
  const [enviando, setEnviando] = useState(false)

  const onArquivoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setArquivoNome(file.name)
    setXml(await file.text())
  }

  const podeImportar = xml.trim().length > 0 && Boolean(tipoDocumento) && Boolean(objetivoSaida) && !enviando

  const importar = async () => {
    if (!podeImportar) return
    setEnviando(true)
    try {
      const result = await importarDocumentoEmitidoManual({
        xml,
        tipo_documento: tipoDocumento,
        objetivo_saida: objetivoSaida,
      })
      showToast({
        variant: result.created ? 'success' : 'warning',
        title: 'Documento emitido',
        message: result.created ? 'XML emitido importado com sucesso.' : 'Documento já estava cadastrado.',
      })
      navigate(fiscalPaths.relatorioNfes)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Importação de saída',
        message: extrairMensagemErroApi(err) || 'Não foi possível importar o XML emitido.',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="container-fluid">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.relatorioNfes}>Relatório de NF-es</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Importar saída
          </li>
        </ol>
      </nav>

      <div className="row">
        <div className="col-lg-9 col-xl-8">
          <h1 className="h3 mb-2">Importar XML emitido pela ZFW</h1>
          <p className="text-muted">
            Use esta tela para registrar NF-e de produtos ou NFS-e de serviços emitidas pela ZFW,
            permitindo relatórios gerenciais de saídas junto com as entradas.
          </p>

          <div className="card">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="tipo-documento-emitido">
                    Tipo de documento
                  </label>
                  <select
                    id="tipo-documento-emitido"
                    className="form-select"
                    value={tipoDocumento}
                    onChange={(e) => {
                      const tipo = e.target.value as TipoDocumentoFiscalEmitido
                      setTipoDocumento(tipo)
                      setObjetivoSaida(tipo === 'NFSE_SERVICO' ? 'PRESTACAO_SERVICO' : 'VENDA_PRODUTO')
                    }}
                  >
                    <option value="NFE_PRODUTO">NF-e de produto</option>
                    <option value="NFSE_SERVICO">NFS-e de serviço</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="objetivo-saida">
                    Finalidade da saída
                  </label>
                  <select
                    id="objetivo-saida"
                    className="form-select"
                    value={objetivoSaida}
                    onChange={(e) => setObjetivoSaida(e.target.value as ObjetivoSaidaFiscal)}
                  >
                    {objetivoSaidaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="xml-emitido-file">
                    Arquivo XML
                  </label>
                  <input
                    id="xml-emitido-file"
                    type="file"
                    className="form-control"
                    accept=".xml,application/xml,text/xml"
                    onChange={onArquivoChange}
                  />
                  {arquivoNome ? <div className="form-text">Arquivo selecionado: {arquivoNome}</div> : null}
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="xml-emitido-texto">
                    Ou cole o XML
                  </label>
                  <textarea
                    id="xml-emitido-texto"
                    className="form-control font-monospace"
                    rows={12}
                    value={xml}
                    onChange={(e) => setXml(e.target.value)}
                    placeholder="<nfeProc>...</nfeProc> ou XML de NFS-e"
                  />
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <button type="button" className="btn btn-primary" disabled={!podeImportar} onClick={() => void importar()}>
                  {enviando ? 'Importando…' : 'Importar saída'}
                </button>
                <Link to={fiscalPaths.relatorioNfes} className="btn btn-outline-secondary">
                  Voltar ao relatório
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
