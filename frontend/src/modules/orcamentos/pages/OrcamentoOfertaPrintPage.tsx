import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import PropostaClienteDocument from '../components/PropostaClienteDocument'
import { obterPreviewOfertaOrcamento } from '../services/orcamentosApi'
import { imprimirPropostaCliente } from '../utils/imprimirPropostaCliente'
import type { OrcamentoPreviewOfertaDto } from '../types/orcamentos'

export default function OrcamentoOfertaPrintPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [preview, setPreview] = useState<OrcamentoPreviewOfertaDto | null>(null)
  const [carregando, setCarregando] = useState(true)

  useAppPageToolbar(
    useMemo(
      () => ({
        title: preview?.codigo ?? 'Proposta para o cliente',
        subtitle: preview
          ? `${preview.titulo} · visualização enviada ao cliente`
          : 'Carregando modelo de oferta',
        back: { to: id ? `/orcamentos/${id}` : '/orcamentos', label: 'Proposta' },
      }),
      [id, preview]
    )
  )

  const carregar = useCallback(async () => {
    if (!id) return
    setCarregando(true)
    try {
      setPreview(await obterPreviewOfertaOrcamento(id))
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: extrairMensagemErroApi(err) || 'Não foi possível carregar a proposta.',
      })
      setPreview(null)
    } finally {
      setCarregando(false)
    }
  }, [id, showToast])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (!id) {
    return (
      <div className="container-fluid py-4">
        <p className="text-muted">Identificador inválido.</p>
        <Link to="/orcamentos">Voltar à lista</Link>
      </div>
    )
  }

  if (carregando) {
    return <p className="text-muted px-3">A carregar proposta…</p>
  }

  if (!preview) {
    return (
      <p className="text-muted mb-0 px-3">
        Proposta não encontrada. <Link to={`/orcamentos/${id}`}>Voltar à proposta</Link>
      </p>
    )
  }

  return (
    <div className="proposta-cliente-pagina-impressao container-fluid py-3">
      <PropostaClienteDocument
        preview={preview}
        paginaImpressao
        toolbar={
          <>
            <div>
              <strong className="d-block">Como o cliente verá</strong>
              <span className="small text-muted">
                Use Imprimir ou Salvar como PDF. No diálogo do navegador, ative{' '}
                <strong>Gráficos de fundo</strong> para o PDF ficar igual a esta tela.
              </span>
            </div>
            <div className="proposta-cliente__toolbar-actions">
              <Link className="btn btn-sm btn-outline-secondary" to={`/orcamentos/${id}`}>
                Voltar à edição
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => imprimirPropostaCliente()}
              >
                Imprimir / salvar PDF
              </button>
            </div>
          </>
        }
      />
    </div>
  )
}
