/** Executa PATCH de condutores com toast de sucesso/erro padronizado. */

import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

type ToastFn = (input: {
  variant: 'success' | 'danger' | 'warning'
  title?: string
  message: string
}) => void

export async function runPatchWithToast(
  action: () => Promise<unknown>,
  showToast: ToastFn,
  options: { successMessage: string; errorTitle: string }
): Promise<void> {
  try {
    await action()
    showToast({ variant: 'success', message: options.successMessage })
  } catch (err) {
    console.error(err)
    showToast({
      variant: 'danger',
      title: options.errorTitle,
      message: extrairMensagemErroApi(err) || 'Tente novamente.',
    })
  }
}
