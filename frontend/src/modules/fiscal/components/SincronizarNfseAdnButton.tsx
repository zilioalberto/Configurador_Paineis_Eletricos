import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { ApiError } from '@/services/http/ApiError'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import {
  sincronizarNfseAdn,
  type SincronizarNfseAdnResponse,
} from '../services/fiscalNfseRecebidaService'

type Props = {
  readonly cnpj?: string
  readonly className?: string
  readonly size?: 'sm'
  readonly disabled?: boolean
}

function mensagemErro(err: unknown): string {
  if (ApiError.isApiError(err)) {
    const body = err.details as Partial<SincronizarNfseAdnResponse> | undefined
    if (body?.detail) return body.detail
    if (body?.mensagem) return body.mensagem
  }
  return extrairMensagemErroApi(err) || 'Não foi possível consultar o ADN NFS-e.'
}

/** Busca NFS-es de serviço no ADN (tomador = empresa). */
export default function SincronizarNfseAdnButton({
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
    mutationFn: sincronizarNfseAdn,
    onSuccess: (res) => {
      let detalhe = 'Nenhum documento novo no ADN.'
      if (res.documentos_novos > 0) {
        detalhe = `${res.documentos_novos} nova(s) NFS-e(s).`
      } else if (res.documentos_duplicados > 0) {
        detalhe = 'Nenhuma NFS-e nova (já importadas).'
      }
      showToast({
        variant: res.sucesso ? 'success' : 'warning',
        title: res.sucesso ? 'Sincronização ADN concluída' : 'Sincronização ADN com avisos',
        message: `${res.mensagem} ${detalhe}`,
      })
      const digits = cnpj.replace(/\D/g, '')
      if (digits.length === 14) {
        void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.controleNsuNfseAdn(digits) })
      }
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.nfseRecebidasAll })
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'Falha na sincronização ADN',
        message: mensagemErro(err),
      })
    },
  })

  if (!podeEditar) return null

  const sizeClass = size === 'sm' ? ' btn-sm' : ''
  return (
    <button
      type="button"
      className={`${className}${sizeClass}`.trim()}
      disabled={disabled || mutation.isPending}
      onClick={() => mutation.mutate()}
      aria-busy={mutation.isPending}
    >
      {mutation.isPending ? 'Buscando no ADN…' : 'Buscar NFS-e no ADN'}
    </button>
  )
}
