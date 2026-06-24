import type { CnpjConsultaDto } from '../types/cnpj'
import { aplicarMascaraCnpj, apenasDigitosCnpj } from '../utils/cnpjMask'
import { formatarCapitalSocialParceiro } from '../utils/formatarCapitalSocialParceiro'
import CnaesTable, { montarListaCnaes } from './CnaesTable'

function formatarCnpjExibicao(digits: string): string {
  const d = apenasDigitosCnpj(digits)
  if (d.length !== 14) return digits
  return aplicarMascaraCnpj(d)
}

function formatarMoeda(valor: string | null | undefined): string {
  return formatarCapitalSocialParceiro(valor)
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

type Socio = CnpjConsultaDto['socios'][number]

function QuadroSocietarioCnpj({ socios }: Readonly<{ socios: readonly Socio[] }>) {
  if (socios.length === 0) {
    return <p className="small text-muted mb-3">Nenhum sócio retornado na consulta.</p>
  }
  return (
    <div className="mb-3">
      <h3 className="h6">Quadro societário (QSA)</h3>
      <div className="table-responsive">
        <table className="table table-sm table-bordered bg-white mb-0">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Qualificação</th>
              <th>Entrada</th>
              <th>Faixa etária</th>
            </tr>
          </thead>
          <tbody>
            {socios.map((s) => (
              <tr key={`${s.nome}-${s.qualificacao}-${s.data_entrada ?? ''}`}>
                <td>{s.nome}</td>
                <td>{s.qualificacao || '—'}</td>
                <td>{formatarData(s.data_entrada)}</td>
                <td>{s.faixa_etaria || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type ClassificacaoAcoesProps = Readonly<{
  modoAtualizar: boolean
  ehCliente: boolean
  ehFornecedor: boolean
  ehParceiro: boolean
  podeSalvar: boolean
  podeAtualizar: boolean
  salvando: boolean
  atualizando: boolean
  onAplicar: () => void
  onSalvar: () => void
  onAtualizar: () => void
  setEhCliente: (v: boolean) => void
  setEhFornecedor: (v: boolean) => void
  setEhParceiro: (v: boolean) => void
}>

function ClassificacaoEAcoesCnpj({
  modoAtualizar,
  ehCliente,
  ehFornecedor,
  ehParceiro,
  podeSalvar,
  podeAtualizar,
  salvando,
  atualizando,
  onAplicar,
  onSalvar,
  onAtualizar,
  setEhCliente,
  setEhFornecedor,
  setEhParceiro,
}: ClassificacaoAcoesProps) {
  return (
    <>
      <div className="mb-3">
        <div className="small text-muted mb-2">
          {modoAtualizar ? 'Classificação no cadastro:' : 'Ao salvar, classificar como:'}
        </div>
        <div className="d-flex flex-wrap gap-3">
          <div className="form-check">
            <input
              id="cnpj-save-cliente"
              type="checkbox"
              className="form-check-input"
              checked={ehCliente}
              onChange={(e) => setEhCliente(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="cnpj-save-cliente">
              Cliente
            </label>
          </div>
          <div className="form-check">
            <input
              id="cnpj-save-fornecedor"
              type="checkbox"
              className="form-check-input"
              checked={ehFornecedor}
              onChange={(e) => setEhFornecedor(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="cnpj-save-fornecedor">
              Fornecedor
            </label>
          </div>
          <div className="form-check">
            <input
              id="cnpj-save-parceiro"
              type="checkbox"
              className="form-check-input"
              checked={ehParceiro}
              onChange={(e) => setEhParceiro(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="cnpj-save-parceiro">
              Parceiro comercial
            </label>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2">
        {modoAtualizar ? null : (
          <button type="button" className="btn btn-outline-secondary" onClick={onAplicar}>
            Usar no formulário
          </button>
        )}
        {modoAtualizar ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!podeAtualizar || atualizando}
            onClick={onAtualizar}
          >
            {atualizando ? 'Atualizando…' : 'Atualizar dados da Receita'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!podeSalvar || salvando}
            onClick={onSalvar}
          >
            {salvando ? 'Salvando…' : 'Salvar no cadastro'}
          </button>
        )}
      </div>
    </>
  )
}

type Props = Readonly<{
  consulta: CnpjConsultaDto
  canEdit: boolean
  ehCliente: boolean
  ehFornecedor: boolean
  ehParceiro: boolean
  podeSalvar: boolean
  podeAtualizar: boolean
  salvando: boolean
  atualizando: boolean
  onAplicar: () => void
  onSalvar: () => void
  onAtualizar: () => void
  setEhCliente: (v: boolean) => void
  setEhFornecedor: (v: boolean) => void
  setEhParceiro: (v: boolean) => void
}>

export default function CnpjPreview({
  consulta,
  canEdit,
  ehCliente,
  ehFornecedor,
  ehParceiro,
  podeSalvar,
  podeAtualizar,
  salvando,
  atualizando,
  onAplicar,
  onSalvar,
  onAtualizar,
  setEhCliente,
  setEhFornecedor,
  setEhParceiro,
}: Props) {
  const situacaoAtiva = (consulta.situacao_cadastral || '').toUpperCase() === 'ATIVA'
  const modoAtualizar = consulta.ja_cadastrado

  return (
    <div className="border rounded p-3 bg-light">
      {consulta.ja_cadastrado ? (
        <div className="alert alert-info py-2 small mb-3" role="alert">
          Este CNPJ já está cadastrado
          {consulta.parceiro_existente_nome ? `: ${consulta.parceiro_existente_nome}` : ''}. Você pode
          atualizar o cadastro com os dados mais recentes da Receita.
        </div>
      ) : null}

      {situacaoAtiva || !consulta.situacao_cadastral ? null : (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          Situação na Receita: <strong>{consulta.situacao_cadastral}</strong>. Avalie antes de
          cadastrar.
        </div>
      )}

      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <div className="fw-semibold">{consulta.razao_social}</div>
          {consulta.nome_fantasia ? (
            <div className="text-muted small">{consulta.nome_fantasia}</div>
          ) : null}
          <div className="small mt-1">
            CNPJ {formatarCnpjExibicao(consulta.documento)}
            {consulta.matriz_filial ? ` · ${consulta.matriz_filial}` : ''}
          </div>
        </div>
        <div className="col-md-4">
          <div className="small text-muted">Situação</div>
          <div>{consulta.situacao_cadastral || '—'}</div>
          <div className="small text-muted mt-2">Capital social</div>
          <div className="fw-semibold">{formatarMoeda(consulta.capital_social)}</div>
        </div>
      </div>

      <div className="row g-3 small mb-3">
        <div className="col-md-4">
          <span className="text-muted">Início atividade:</span> {formatarData(consulta.data_inicio_atividade)}
        </div>
        <div className="col-md-4">
          <span className="text-muted">Natureza jurídica:</span> {consulta.natureza_juridica || '—'}
        </div>
      </div>

      <div className="mb-3">
        <CnaesTable cnaes={montarListaCnaes(consulta)} />
      </div>

      {consulta.endereco ? (
        <p className="small mb-3">
          <span className="text-muted">Endereço:</span>{' '}
          {[
            consulta.endereco.logradouro,
            consulta.endereco.numero,
            consulta.endereco.complemento,
            consulta.endereco.bairro,
            consulta.endereco.municipio,
            consulta.endereco.uf,
            consulta.endereco.cep,
          ]
            .filter(Boolean)
            .join(', ')}
        </p>
      ) : null}

      <QuadroSocietarioCnpj socios={consulta.socios} />

      {canEdit ? (
        <ClassificacaoEAcoesCnpj
          modoAtualizar={modoAtualizar}
          ehCliente={ehCliente}
          ehFornecedor={ehFornecedor}
          ehParceiro={ehParceiro}
          podeSalvar={podeSalvar}
          podeAtualizar={podeAtualizar}
          salvando={salvando}
          atualizando={atualizando}
          onAplicar={onAplicar}
          onSalvar={onSalvar}
          onAtualizar={onAtualizar}
          setEhCliente={setEhCliente}
          setEhFornecedor={setEhFornecedor}
          setEhParceiro={setEhParceiro}
        />
      ) : null}
    </div>
  )
}
