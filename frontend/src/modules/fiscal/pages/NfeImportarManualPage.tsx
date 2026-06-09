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
import { importarNfeXmlManual } from '../services/fiscalNfeService'
import type { ObjetivoEntradaFiscal } from '../types/documentoFiscalRecebido'

/** Envio de XML para o armazenamento fiscal (NF-e recebida no servidor). */
export default function NfeImportarManualPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [xml, setXml] = useState('')
  const [cnpjDest, setCnpjDest] = useState('')
  const [nsu, setNsu] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [objetivoEntrada, setObjetivoEntrada] = useState<ObjetivoEntradaFiscal | ''>('')

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
      navigate(fiscalPaths.nfeDetalhe(result.documento_id))
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        message: extrairMensagemErroApi(err) || 'Não foi possível importar o XML.',
      })
    },
  })

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNomeArquivo(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setXml(text.trim())
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!xml.trim()) {
        showToast({ variant: 'danger', message: 'Selecione ou cole o conteúdo do XML da NF-e.' })
        return
      }
      if (!objetivoEntrada) {
        showToast({ variant: 'danger', message: 'Informe o objetivo da entrada da NF-e.' })
        return
      }
      mutation.mutate()
    },
    [xml, objetivoEntrada, mutation, showToast],
  )

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
      <p className="text-muted mb-4">
        Grava a NF-e no servidor com itens parseados e XML original. Duplicatas pela chave de 44
        dígitos são ignoradas com aviso. A sincronização automática com a SEFAZ será feita pela
        futura ponte A3; aqui o envio é manual.
      </p>

      <div className="alert alert-info small" role="status">
        Para importar itens para o <strong>catálogo de produtos</strong> (criar/atualizar SKU), use{' '}
        <Link to={catalogoPaths.produtoImportarNfe}>Importar NF-e no catálogo</Link>.
      </div>

      <form onSubmit={onSubmit} className="card border-0 shadow-sm">
        <div className="card-body p-4 d-flex flex-column gap-3">
          <div>
            <label className="form-label fw-semibold" htmlFor="nfe-xml-arquivo">
              Arquivo XML
            </label>
            <input
              id="nfe-xml-arquivo"
              type="file"
              className="form-control"
              accept=".xml,text/xml,application/xml"
              onChange={onFileChange}
            />
            {nomeArquivo ? (
              <p className="form-text mb-0 mt-1">Ficheiro: {nomeArquivo}</p>
            ) : null}
          </div>

          <div>
            <label className="form-label" htmlFor="nfe-xml-texto">
              Ou cole o XML
            </label>
            <textarea
              id="nfe-xml-texto"
              className="form-control font-monospace small"
              rows={8}
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              placeholder="&lt;nfeProc&gt;…"
              spellCheck={false}
            />
          </div>

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
              />
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={mutation.isPending || !xml.trim() || !objetivoEntrada}
            >
              {mutation.isPending ? 'A importar…' : 'Importar'}
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
