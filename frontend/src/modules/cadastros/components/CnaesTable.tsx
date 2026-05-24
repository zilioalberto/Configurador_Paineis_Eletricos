export type CnaeLinha = {
  codigo: string
  descricao: string
  principal?: boolean
}

type CnaesTableProps = Readonly<{
  cnaes: CnaeLinha[]
  titulo?: string
  vazio?: string
}>

export default function CnaesTable({
  cnaes,
  titulo = 'CNAEs',
  vazio = 'Nenhum CNAE retornado na consulta.',
}: CnaesTableProps) {
  if (cnaes.length === 0) {
    return <p className="small text-muted mb-0">{vazio}</p>
  }

  return (
    <div>
      <h3 className="h6">{titulo}</h3>
      <div className="table-responsive">
        <table className="table table-sm table-bordered bg-white mb-0">
          <thead>
            <tr>
              <th style={{ width: '7rem' }}>Código</th>
              <th>Descrição</th>
              <th style={{ width: '6rem' }}>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {cnaes.map((cnae) => (
              <tr key={`${cnae.codigo}-${cnae.principal ? 'p' : 's'}`}>
                <td className="font-monospace">{cnae.codigo}</td>
                <td>{cnae.descricao || '—'}</td>
                <td>{cnae.principal ? 'Principal' : 'Secundário'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Monta lista de CNAEs a partir do preview ou campos legados do parceiro. */
export function montarListaCnaes(input: {
  cnaes?: CnaeLinha[]
  cnae_fiscal?: string
  cnae_fiscal_descricao?: string
}): CnaeLinha[] {
  if (input.cnaes && input.cnaes.length > 0) {
    return input.cnaes.map((c) => ({
      codigo: c.codigo,
      descricao: c.descricao,
      principal: c.principal,
    }))
  }
  if (input.cnae_fiscal) {
    return [
      {
        codigo: input.cnae_fiscal,
        descricao: input.cnae_fiscal_descricao ?? '',
        principal: true,
      },
    ]
  }
  return []
}
