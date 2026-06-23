import { type SyntheticEvent, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import {
  importarNfesPorChaveSefaz,
  type ImportarNfesPorChaveResponse,
  type ImportarPorChaveItem,
} from '../services/fiscalNfeService'

const MAX_CHAVES = 50

function extrairChaves(texto: string): { chaves: string[]; invalidos: number } {
  const tokens = (texto || '').split(/[\s,;]+/).filter(Boolean)
  const chaves: string[] = []
  const vistas = new Set<string>()
  let invalidos = 0
  for (const token of tokens) {
    const digitos = token.replace(/\D/g, '')
    if (digitos.length === 44) {
      if (!vistas.has(digitos)) {
        vistas.add(digitos)
        chaves.push(digitos)
      }
    } else {
      invalidos += 1
    }
  }
  return { chaves, invalidos }
}

function formatChave(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function BadgeStatus({ status }: Readonly<{ status: ImportarPorChaveItem['status'] }>) {
  switch (status) {
    case 'importada':
      return <span className="badge text-bg-success">Importada</span>
    case 'duplicada':
      return <span className="badge text-bg-secondary">Já importada</span>
    case 'resumo':
      return <span className="badge text-bg-info">Somente resumo</span>
    case 'nao_encontrada':
      return <span className="badge text-bg-warning">Não encontrada</span>
    default:
      return <span className="badge text-bg-danger">Erro</span>
  }
}

/** Busca/importa NF-es recebidas pela chave de acesso (consChNFe — recuperação retroativa). */
export default function NfeBuscarChavePage() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [texto, setTexto] = useState('')
  const [resposta, setResposta] = useState<ImportarNfesPorChaveResponse | null>(null)

  const { chaves, invalidos } = useMemo(() => extrairChaves(texto), [texto])
  const excedeLimite = chaves.length > MAX_CHAVES

  const mutation = useMutation({
    mutationFn: () => importarNfesPorChaveSefaz(chaves),
    onSuccess: (data) => {
      setResposta(data)
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all })
      showToast({
        variant: data.erros || data.nao_encontradas ? 'warning' : 'success',
        message: `${data.importadas} importada(s), ${data.duplicadas} já existente(s), ${data.nao_encontradas} não encontrada(s), ${data.erros} com erro.`,
      })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        message: extrairMensagemErroApi(err) || 'Não foi possível consultar a SEFAZ.',
      })
    },
  })

  const onSubmit = useCallback(
    (e: SyntheticEvent) => {
      e.preventDefault()
      if (!chaves.length) {
        showToast({ variant: 'danger', message: 'Informe ao menos uma chave de 44 dígitos.' })
        return
      }
      if (excedeLimite) {
        showToast({ variant: 'danger', message: `Máximo de ${MAX_CHAVES} chaves por vez.` })
        return
      }
      setResposta(null)
      mutation.mutate()
    },
    [chaves.length, excedeLimite, mutation, showToast],
  )

  return (
    <div className="container-fluid" style={{ maxWidth: '52rem' }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.nfes}>NF-es recebidas</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Buscar por chave (SEFAZ)
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Buscar NF-e por chave de acesso</h1>
      <p className="text-muted mb-2">
        Consulta pontual na SEFAZ pela chave de 44 dígitos (consChNFe). Diferente da sincronização
        por NSU, não avança o cursor e não causa bloqueio (cStat 656) — ideal para recuperar notas
        retroativas cuja chave você conhece.
      </p>
      <div className="alert alert-light border small text-muted mb-4">
        Quando a NF-e está disponível para você (destinatário), a SEFAZ devolve o <strong>XML
        completo</strong> e a nota é importada direto, sem precisar do resumo. Se ainda não estiver
        liberada, retornamos apenas o resumo — manifeste a Ciência da Operação para liberar o XML.
      </div>

      <form onSubmit={onSubmit} className="card border-0 shadow-sm">
        <div className="card-body p-4 d-flex flex-column gap-3">
          <div>
            <label className="form-label" htmlFor="chaves-acesso">
              Chaves de acesso
            </label>
            <textarea
              id="chaves-acesso"
              className="form-control font-monospace small"
              rows={6}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={'Uma chave por linha (44 dígitos). Ex.:\n35200114200166000187550010000000211000000017'}
              spellCheck={false}
            />
            <div className="form-text d-flex flex-wrap gap-3">
              <span>
                <strong>{chaves.length}</strong> chave(s) válida(s)
              </span>
              {invalidos > 0 ? (
                <span className="text-warning-emphasis">{invalidos} ignorada(s) (não têm 44 dígitos)</span>
              ) : null}
              {excedeLimite ? (
                <span className="text-danger">Máximo de {MAX_CHAVES} por vez</span>
              ) : null}
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={mutation.isPending || chaves.length === 0 || excedeLimite}
            >
              {mutation.isPending ? 'Consultando a SEFAZ…' : `Buscar ${chaves.length || ''} na SEFAZ`}
            </button>
            <Link to={fiscalPaths.nfes} className="btn btn-outline-secondary">
              Voltar
            </Link>
          </div>
        </div>
      </form>

      {resposta ? (
        <div className="card border-0 shadow-sm mt-3">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h2 className="h6 mb-0">Resultado ({resposta.total})</h2>
              <span className="small text-muted">
                {resposta.importadas} importada(s) · {resposta.duplicadas} já existente(s) ·{' '}
                {resposta.resumos} resumo(s) · {resposta.nao_encontradas} não encontrada(s) ·{' '}
                {resposta.erros} com erro
              </span>
            </div>
            <ul className="list-group">
              {resposta.resultados.map((item) => (
                <li key={item.chave} className="list-group-item">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <code className="small">{formatChave(item.chave)}</code>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      <BadgeStatus status={item.status} />
                      {item.documento_id ? (
                        <Link
                          to={fiscalPaths.nfeDetalhe(item.documento_id)}
                          className="btn btn-sm btn-outline-primary py-0"
                        >
                          Abrir
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {item.mensagem ? (
                    <div className="small text-muted mt-1">{item.mensagem}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
