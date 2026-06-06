import type { ParceiroComercialDto } from '@/modules/cadastros/types/cadastros'
import type { ProjetoClienteOption } from '../types/projeto'

function normalizarNomeCliente(valor: string): string {
  return valor.trim().toUpperCase()
}

/** Alinha nome vindo da URL ou de projeto antigo com a razão social do cadastro. */
export function resolverClienteInicial(
  nome: string,
  clientes: ParceiroComercialDto[]
): string {
  const busca = nome.trim()
  if (!busca) return ''
  const encontrado = clientes.find(
    (c) => normalizarNomeCliente(c.razao_social) === normalizarNomeCliente(busca)
  )
  return encontrado?.razao_social ?? busca
}

/** Opções do select; inclui valor gravado fora do cadastro (projetos legados). */
export function buildClienteSelectOptions(
  clientes: ParceiroComercialDto[],
  valorAtual: string
): ProjetoClienteOption[] {
  const opcoes = clientes.map((c) => ({
    value: c.razao_social,
    label: `${c.razao_social} (${c.documento})`,
  }))
  const atual = valorAtual.trim()
  if (
    atual &&
    !opcoes.some((o) => normalizarNomeCliente(o.value) === normalizarNomeCliente(atual))
  ) {
    opcoes.unshift({
      value: atual,
      label: `${atual} — fora do cadastro`,
    })
  }
  return opcoes
}
