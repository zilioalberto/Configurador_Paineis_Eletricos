import type { ChangeEvent } from 'react'
import type { ProjetoFormData, ProjetoResponsavelOption } from '../../types/projeto'

export type ProjetoFormFieldChangeHandler = (
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => void

export type ProjetoFormSectionProps = {
  formData: ProjetoFormData
  onFieldChange: ProjetoFormFieldChangeHandler
  /** Erros de validação (cliente ou API) por nome do campo. */
  fieldErrors?: Record<string, string>
  responsavelOptions?: ProjetoResponsavelOption[]
  canEditResponsavel?: boolean
  showStatus?: boolean
  /**
   * Status Finalizado: bloqueia edição de todos os campos exceto o select Status.
   * Com Em andamento, o formulário volta a ser editável e pode ser salvo.
   */
  readOnlyExceptStatus?: boolean
}
