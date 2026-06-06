/**
 * Carrega contatos do cliente selecionado no formulário de orçamento.
 */
import { useEffect, useState } from 'react'
import { listarContatosCliente } from '../services/orcamentosApi'
import type { ContatoClienteDto } from '../types/orcamentos'

type ToastFn = (input: {
  variant: 'success' | 'danger' | 'warning'
  title?: string
  message: string
}) => void

/** Mantém contato selecionado apenas se ainda existir na lista carregada. */
export function contatoIdValidoParaLista(
  atual: string,
  contatos: ContatoClienteDto[]
): string {
  return atual && contatos.some((c) => c.id === atual) ? atual : ''
}

/** Hook que busca contatos quando `clienteId` muda; avisa em falha de rede. */
export function useOrcamentoContatosCliente(
  clienteId: string,
  showToast: ToastFn,
  onContatosCarregados?: (contatos: ContatoClienteDto[]) => void
) {
  const [contatos, setContatos] = useState<ContatoClienteDto[]>([])

  useEffect(() => {
    if (!clienteId) {
      setContatos([])
      onContatosCarregados?.([])
      return
    }

    let ativo = true
    listarContatosCliente(clienteId)
      .then((dados) => {
        if (!ativo) return
        setContatos(dados)
        onContatosCarregados?.(dados)
      })
      .catch(() => {
        if (!ativo) return
        setContatos([])
        onContatosCarregados?.([])
        showToast({
          variant: 'warning',
          title: 'Contatos',
          message: 'Não foi possível carregar os contatos do cliente.',
        })
      })

    return () => {
      ativo = false
    }
  }, [clienteId, showToast, onContatosCarregados])

  return contatos
}
