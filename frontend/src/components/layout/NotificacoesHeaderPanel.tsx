import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  contagemNotificacoesNaoLidas,
  listarNotificacoesInternas,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
  type NotificacaoInternaDto,
} from '@/services/notificacoesApi'

type Props = Readonly<{
  aberto: boolean
  panelId?: string
  onContagemChange?: () => void
  onNavigate?: () => void
}>

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function linkInterno(link: string): string {
  if (!link) return ''
  try {
    const url = new URL(link)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return link.startsWith('/') ? link : `/${link}`
  }
}

export function useNotificacoesInternas(pollMs = 60_000) {
  const [naoLidas, setNaoLidas] = useState(0)

  const atualizarContagem = useCallback(async () => {
    try {
      const n = await contagemNotificacoesNaoLidas()
      setNaoLidas(n)
    } catch {
      setNaoLidas(0)
    }
  }, [])

  useEffect(() => {
    void atualizarContagem()
    const id = window.setInterval(() => void atualizarContagem(), pollMs)
    return () => window.clearInterval(id)
  }, [atualizarContagem, pollMs])

  return { naoLidas, atualizarContagem }
}

export default function NotificacoesHeaderPanel({
  aberto,
  panelId,
  onContagemChange,
  onNavigate,
}: Props) {
  const [itens, setItens] = useState<NotificacaoInternaDto[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const lista = await listarNotificacoesInternas()
      setItens(lista)
      onContagemChange?.()
    } catch {
      setItens([])
      onContagemChange?.()
    } finally {
      setCarregando(false)
    }
  }, [onContagemChange])

  useEffect(() => {
    if (aberto) void recarregar()
  }, [aberto, recarregar])

  async function abrirItem(item: NotificacaoInternaDto) {
    if (!item.lida) {
      try {
        await marcarNotificacaoLida(item.id)
      } catch {
        /* ignore */
      }
    }
    onNavigate?.()
    void recarregar()
  }

  async function marcarTodas() {
    await marcarTodasNotificacoesLidas()
    await recarregar()
  }

  if (!aberto) return null

  return (
    <dialog
      open
      id={panelId}
      className="app-header-dropdown app-header-notif-panel shadow-sm"
      aria-label="Notificações"
    >
      <div className="d-flex align-items-center justify-content-between mb-2 px-1">
        <strong className="small">Notificações</strong>
        {itens.some((i) => !i.lida) ? (
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => void marcarTodas()}>
            Marcar todas como lidas
          </button>
        ) : null}
      </div>

      {carregando ? (
        <p className="small text-muted mb-0">A carregar…</p>
      ) : itens.length === 0 ? (
        <p className="small text-muted mb-0">Sem alertas no momento.</p>
      ) : (
        <ul className="app-header-notif-list list-unstyled mb-0">
          {itens.map((item) => {
            const destino = linkInterno(item.link)
            const conteudo = (
              <>
                <span className="app-header-notif-list__titulo">{item.titulo}</span>
                {item.mensagem ? (
                  <span className="app-header-notif-list__msg">{item.mensagem}</span>
                ) : null}
                <span className="app-header-notif-list__data">{formatarData(item.criado_em)}</span>
              </>
            )
            return (
              <li
                key={item.id}
                className={
                  item.lida
                    ? 'app-header-notif-list__item'
                    : 'app-header-notif-list__item app-header-notif-list__item--nova'
                }
              >
                {destino ? (
                  <Link
                    to={destino}
                    className="app-header-notif-list__link"
                    onClick={() => void abrirItem(item)}
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="app-header-notif-list__link btn btn-link text-start w-100"
                    onClick={() => void abrirItem(item)}
                  >
                    {conteudo}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </dialog>
  )
}
