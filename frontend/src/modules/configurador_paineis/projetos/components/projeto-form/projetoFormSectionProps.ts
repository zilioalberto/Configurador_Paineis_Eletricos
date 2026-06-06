/** Props compartilhadas pelas seções visuais do formulário de projeto. */

import type { ChangeEvent } from 'react'
import type {
  ProjetoClienteOption,
  ProjetoFormData,
  ProjetoResponsavelOption,
} from '../../types/projeto'

export type ProjetoFormFieldChangeHandler = (
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => void

export type ProjetoFormSectionProps = {
  formData: ProjetoFormData
  onFieldChange: ProjetoFormFieldChangeHandler
  /** Erros de validação (cliente ou API) por nome do campo. */
  fieldErrors?: Record<string, string>
  responsavelOptions?: ProjetoResponsavelOption[]
  clienteOptions?: ProjetoClienteOption[]
  carregandoClientes?: boolean
  canEditResponsavel?: boolean
  showStatus?: boolean
  /**
   * Status Finalizado: bloqueia edição de todos os campos exceto o select Status.
   * Com Em andamento, o formulário volta a ser editável e pode ser salvo.
   */
  readOnlyExceptStatus?: boolean
}
