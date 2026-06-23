import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { ApiError } from '@/services/http/ApiError'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { sincronizarNfesSefaz, type SincronizarNfesSefazResponse } from '../services/fiscalNfeService'
import { formatSefazSyncToast } from '../utils/sefazSyncFeedback'

type Props = {
  readonly cnpj?: string
  readonly className?: string
  readonly size?: 'sm' | undefined
  readonly disabled?: boolean
}

function mensagemErroSincronizacao(err: unknown): string {
  if (ApiError.isApiError(err)) {
    const body = err.details as Partial<SincronizarNfesSefazResponse> | undefined
    if (body?.detail) return body.detail
    if (body?.mensagem || body?.alertas?.length || body?.ultimo_cstat) {
      return formatSefazSyncToast({
        sucesso: false,
        mensagem: body.mensagem ?? '',
        ciclos_executados: body.ciclos_executados ?? 0,
        documentos_importados: body.documentos_importados ?? 0,
        documentos_novos: body.documentos_novos ?? 0,
        documentos_duplicados: body.documentos_duplicados ?? 0,
        erros_importacao: body.erros_importacao ?? [],
        alertas: body.alertas ?? [],
        ultimo_cstat: body.ultimo_cstat ?? '',
        ultimo_motivo: body.ultimo_motivo,
        ultimo_nsu: body.ultimo_nsu ?? '',
        max_nsu: body.max_nsu ?? '',
        manifestacoes_processadas: body.manifestacoes_processadas ?? 0,
      }).message
    }
  }
  return extrairMensagemErroApi(err) || 'Não foi possível consultar a SEFAZ.'
}

/** Busca NF-es na SEFAZ manualmente (DistDFe + importação no servidor). */
export default function SincronizarNfesSefazButton({
  cnpj = '',
  className = 'btn btn-primary',
  size,
  disabled = false,
}: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const podeEditar = hasPermission(user, PERMISSION_KEYS.FISCAL_EDITAR)

  const mutation = useMutation({
    mutationFn: sincronizarNfesSefaz,
    onSuccess: (res) => {
      showToast(formatSefazSyncToast(res))
      const digits = cnpj.replace(/\D/g, '')
      if (digits.length === 14) {
        void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.controleNsu(digits) })
      }
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'Falha na sincronização',
        message: mensagemErroSincronizacao(err),
      })
    },
  })

  if (!podeEditar) {
    return null
  }

  const sizeClass = size === 'sm' ? ' btn-sm' : ''
  const pending = mutation.isPending

  return (
    <button
      type="button"
      className={`${className}${sizeClass}`.trim()}
      disabled={disabled || pending}
      onClick={() => mutation.mutate()}
      aria-busy={pending}
    >
      {pending ? 'Buscando na SEFAZ…' : 'Buscar NF-es na SEFAZ'}
    </button>
  )
}
