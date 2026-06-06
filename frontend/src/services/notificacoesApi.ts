import apiClient from '@/services/apiClient'

export type NotificacaoInternaDto = {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  link: string
  referencia_app: string
  referencia_id: string | null
  lida: boolean
  lida_em: string | null
  criado_em: string
}

export async function listarNotificacoesInternas(): Promise<NotificacaoInternaDto[]> {
  const { data } = await apiClient.get<NotificacaoInternaDto[]>('/notificacoes/')
  return data
}

export async function contagemNotificacoesNaoLidas(): Promise<number> {
  const { data } = await apiClient.get<{ nao_lidas: number }>('/notificacoes/contagem/')
  return data.nao_lidas ?? 0
}

export async function marcarNotificacaoLida(id: string): Promise<NotificacaoInternaDto> {
  const { data } = await apiClient.post<NotificacaoInternaDto>(`/notificacoes/${id}/marcar-lida/`)
  return data
}

export async function marcarTodasNotificacoesLidas(): Promise<void> {
  await apiClient.post('/notificacoes/marcar-todas-lidas/')
}
