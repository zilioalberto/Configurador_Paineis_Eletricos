import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { sincronizarNfesSefaz } from '../services/fiscalNfeService'

type Props = {
  readonly cnpj?: string
  readonly className?: string
  readonly size?: 'sm' | undefined
  readonly disabled?: boolean
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
      const detalhe =
        res.documentos_novos > 0
          ? `${res.documentos_novos} nova(s) NF-e(s).`
          : res.documentos_duplicados > 0
            ? 'Nenhuma NF-e nova (já importadas).'
            : 'Nenhum documento novo na SEFAZ.'
      showToast({
        variant: res.sucesso ? 'success' : 'warning',
        title: res.sucesso ? 'Sincronização concluída' : 'Sincronização com avisos',
        message: `${res.mensagem} ${detalhe}`,
      })
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
        message: extrairMensagemErroApi(err) || 'Não foi possível consultar a SEFAZ.',
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
