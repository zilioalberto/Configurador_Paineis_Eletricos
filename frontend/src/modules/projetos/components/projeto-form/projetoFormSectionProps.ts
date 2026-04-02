import type { ChangeEvent } from 'react'
import type { ProjetoFormData } from '../../types/projeto'

export type ProjetoFormFieldChangeHandler = (
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => void

export type ProjetoFormSectionProps = {
  formData: ProjetoFormData
  onFieldChange: ProjetoFormFieldChangeHandler
  /**
   * Status Finalizado: bloqueia edição de todos os campos exceto o select Status.
   * Com Em andamento, o formulário volta a ser editável e pode ser salvo.
   */
  readOnlyExceptStatus?: boolean
}
