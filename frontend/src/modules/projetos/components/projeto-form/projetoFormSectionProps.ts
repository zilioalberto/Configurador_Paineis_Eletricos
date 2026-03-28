import type { ChangeEvent } from 'react'
import type { ProjetoFormData } from '../../types/projeto'

export type ProjetoFormFieldChangeHandler = (
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => void

export type ProjetoFormSectionProps = {
  formData: ProjetoFormData
  onFieldChange: ProjetoFormFieldChangeHandler
}
