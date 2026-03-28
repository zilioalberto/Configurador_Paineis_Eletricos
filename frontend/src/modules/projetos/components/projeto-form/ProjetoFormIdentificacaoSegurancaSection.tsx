import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'

export function ProjetoFormIdentificacaoSegurancaSection({
  formData,
  onFieldChange,
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus

  return (
    <>
      <div className="col-12">
        <hr />
        <h2 className="h5">Identificação e segurança</h2>
      </div>

      <ProjetoFormCheckboxField
        name="possui_plaqueta_identificacao"
        label="Plaqueta de identificação"
        checked={formData.possui_plaqueta_identificacao}
        onChange={onFieldChange}
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_faixa_identificacao"
        label="Faixa de identificação"
        checked={formData.possui_faixa_identificacao}
        onChange={onFieldChange}
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_adesivo_alerta"
        label="Adesivo de alerta"
        checked={formData.possui_adesivo_alerta}
        onChange={onFieldChange}
        disabled={ro}
      />

      <ProjetoFormCheckboxField
        name="possui_adesivos_tensao"
        label="Adesivos de tensão"
        checked={formData.possui_adesivos_tensao}
        onChange={onFieldChange}
        disabled={ro}
      />
    </>
  )
}
