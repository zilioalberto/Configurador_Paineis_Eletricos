import { ProjetoFormCheckboxField } from './ProjetoFormCheckboxField'
import type { ProjetoFormSectionProps } from './projetoFormSectionProps'

/** Seção: plaquetas, faixas e adesivos de identificação/segurança. */
export function ProjetoFormIdentificacaoSegurancaSection({
  formData,
  onFieldChange,
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus

  return (
    <div className="col-12">
      <div className="row g-3">
        <ProjetoFormCheckboxField
          name="possui_plaqueta_identificacao"
          label="Plaqueta de identificação"
          checked={formData.possui_plaqueta_identificacao}
          onChange={onFieldChange}
          columnClassName="col-sm-6 col-md-6 col-lg-3"
          disabled={ro}
        />
        <ProjetoFormCheckboxField
          name="possui_faixa_identificacao"
          label="Faixa de identificação"
          checked={formData.possui_faixa_identificacao}
          onChange={onFieldChange}
          columnClassName="col-sm-6 col-md-6 col-lg-3"
          disabled={ro}
        />
        <ProjetoFormCheckboxField
          name="possui_adesivo_alerta"
          label="Adesivo de alerta"
          checked={formData.possui_adesivo_alerta}
          onChange={onFieldChange}
          columnClassName="col-sm-6 col-md-6 col-lg-3"
          disabled={ro}
        />
        <ProjetoFormCheckboxField
          name="possui_adesivos_tensao"
          label="Adesivos de tensão"
          checked={formData.possui_adesivos_tensao}
          onChange={onFieldChange}
          columnClassName="col-sm-6 col-md-6 col-lg-3"
          disabled={ro}
        />
      </div>
    </div>
  )
}
