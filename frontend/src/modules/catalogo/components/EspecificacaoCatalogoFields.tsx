import type { CategoriaProdutoNome } from '../types/categoria'
import { SPEC_FIELDS_BY_CATEGORIA } from '../utils/specFormHelpers'
import { renderCampoEspecificacao } from './especificacaoCampoRenderer'

type Props = {
  categoria: CategoriaProdutoNome
  value: Record<string, string | number | boolean>
  onPatch: (patch: Record<string, string | number | boolean>) => void
}

export default function EspecificacaoCatalogoFields({ categoria, value, onPatch }: Props) {
  const fields = SPEC_FIELDS_BY_CATEGORIA[categoria]
  if (!fields?.length) return null

  return (
    <>
      <div className="col-12 mt-3">
        <h2 className="h6 text-muted mb-2">Especificação técnica</h2>
        <p className="small text-muted mb-0">
          Campos alinhados aos modelos do catálogo no servidor. Na criação, pode deixar em
          branco: a API aplica valores padrão da categoria quando o objeto da especificação
          está vazio.
        </p>
      </div>
      {fields.map(({ name, django }) =>
        renderCampoEspecificacao(categoria, name, django, value, onPatch)
      )}
    </>
  )
}
