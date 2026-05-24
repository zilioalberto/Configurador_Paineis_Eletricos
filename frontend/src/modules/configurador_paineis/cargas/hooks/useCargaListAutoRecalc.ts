/**
 * Recalcula dimensionamento automaticamente quando a assinatura das cargas
 * muda na listagem (evita resumo desatualizado após CRUD).
 */

import { useEffect, useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'

type Params = {
  projetoIdListagem: string | null
  podeRecalcular: boolean
  loadingCargas: boolean
  isError: boolean
  cargasSignature: string
  recalcMutation: UseMutationResult<unknown, unknown, void, unknown>
}

export function useCargaListAutoRecalc({
  projetoIdListagem,
  podeRecalcular,
  loadingCargas,
  isError,
  cargasSignature,
  recalcMutation,
}: Params): string {
  const [autoRecalcFeedback, setAutoRecalcFeedback] = useState('')
  const autoRecalcKeyRef = useRef('')
  const autoRecalcPendingRef = useRef(false)
  const autoRecalcFeedbackTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!projetoIdListagem || !podeRecalcular) return
    if (loadingCargas || isError) return

    const key = `${projetoIdListagem}|${cargasSignature}`
    if (!cargasSignature || autoRecalcKeyRef.current === key || autoRecalcPendingRef.current) {
      return
    }

    autoRecalcPendingRef.current = true
    setAutoRecalcFeedback('Atualizando resumo automaticamente...')

    recalcMutation
      .mutateAsync()
      .then(() => {
        autoRecalcKeyRef.current = key
        setAutoRecalcFeedback('Resumo atualizado automaticamente.')
        if (autoRecalcFeedbackTimerRef.current) {
          window.clearTimeout(autoRecalcFeedbackTimerRef.current)
        }
        autoRecalcFeedbackTimerRef.current = window.setTimeout(() => {
          setAutoRecalcFeedback('')
          autoRecalcFeedbackTimerRef.current = null
        }, 2200)
      })
      .catch((err) => {
        console.error(err)
        setAutoRecalcFeedback('')
      })
      .finally(() => {
        autoRecalcPendingRef.current = false
      })
  }, [
    projetoIdListagem,
    podeRecalcular,
    loadingCargas,
    isError,
    cargasSignature,
    recalcMutation,
  ])

  useEffect(() => {
    return () => {
      if (autoRecalcFeedbackTimerRef.current) {
        window.clearTimeout(autoRecalcFeedbackTimerRef.current)
      }
    }
  }, [])

  return autoRecalcFeedback
}
