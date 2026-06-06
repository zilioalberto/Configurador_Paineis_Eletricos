import type { ProjetoFormSectionProps } from './projetoFormSectionProps'

/** Campo de descrição livre — exibido por último no formulário. */
export function ProjetoFormDescricaoSection({
  formData,
  onFieldChange,
  readOnlyExceptStatus = false,
}: ProjetoFormSectionProps) {
  const ro = readOnlyExceptStatus

  return (
    <div className="col-12">
      <label className="form-label" htmlFor="projeto-form-descricao">
        Descrição
      </label>
      <textarea
        id="projeto-form-descricao"
        name="descricao"
        className="form-control"
        rows={4}
        value={formData.descricao}
        onChange={onFieldChange}
        disabled={ro}
        placeholder="Observações gerais sobre a configuração do painel (opcional)"
      />
    </div>
  )
}
