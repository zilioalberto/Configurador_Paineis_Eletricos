import { useCallback, useEffect, useState } from 'react'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import {
  atualizarParceiroPorCnpj,
  consultarCnpj,
  salvarParceiroPorCnpj,
} from '../services/cadastrosApi'
import type { ParceiroComercialDto } from '../types/cadastros'
import type { CnpjConsultaDto } from '../types/cnpj'
import { aplicarMascaraCnpj, apenasDigitosCnpj } from '../utils/cnpjMask'
import { formatarCapitalSocialParceiro } from '../utils/formatarCapitalSocialParceiro'
import CnaesTable, { montarListaCnaes } from './CnaesTable'

export type CnpjAplicarFormularioInput = {
  documento: string
  razao_social: string
  nome_fantasia: string
  email: string
  telefone: string
  inscricao_estadual: string
  endereco: {
    nome: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    municipio: string
    uf: string
    cep: string
    principal: boolean
  } | null
}

type CnpjConsultaSectionProps = Readonly<{
  canEdit: boolean
  /** CNPJ do parceiro selecionado (14 dígitos ou mascarado). */
  cnpjInicial?: string | null
  parceiroSelecionadoId?: string | null
  onAplicarFormulario: (dados: CnpjAplicarFormularioInput) => void
  onSalvo: (parceiro: ParceiroComercialDto) => void
}>

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

function sincronizarPapeisExistente(consulta: CnpjConsultaDto): {
  ehCliente: boolean
  ehFornecedor: boolean
  ehParceiro: boolean
} {
  return {
    ehCliente: Boolean(consulta.parceiro_existente_eh_cliente),
    ehFornecedor: Boolean(consulta.parceiro_existente_eh_fornecedor),
    ehParceiro: Boolean(consulta.parceiro_existente_eh_parceiro),
  }
}

export default function CnpjConsultaSection({
  canEdit,
  cnpjInicial,
  parceiroSelecionadoId,
  onAplicarFormulario,
  onSalvo,
}: CnpjConsultaSectionProps) {
  const { showToast } = useToast()
  const [cnpjInput, setCnpjInput] = useState('')
  const [consulta, setConsulta] = useState<CnpjConsultaDto | null>(null)
  const [consultando, setConsultando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [ehCliente, setEhCliente] = useState(true)
  const [ehFornecedor, setEhFornecedor] = useState(false)
  const [ehParceiro, setEhParceiro] = useState(false)

  useEffect(() => {
    if (!cnpjInicial) return
    const digits = apenasDigitosCnpj(cnpjInicial)
    if (digits.length === 14) {
      setCnpjInput(aplicarMascaraCnpj(digits))
    }
  }, [cnpjInicial])

  const documentoLimpo = apenasDigitosCnpj(cnpjInput)
  const podeConsultar = documentoLimpo.length === 14
  const temClassificacao = ehCliente || ehFornecedor || ehParceiro
  const parceiroIdAtualizar =
    consulta?.parceiro_existente_id ??
    (parceiroSelecionadoId && consulta?.ja_cadastrado ? parceiroSelecionadoId : null)

  const podeSalvar =
    canEdit && consulta && !consulta.ja_cadastrado && temClassificacao
  const podeAtualizar =
    canEdit && consulta?.ja_cadastrado && Boolean(parceiroIdAtualizar) && temClassificacao

  const executarConsulta = useCallback(async () => {
    if (!podeConsultar) return
    setConsultando(true)
    setConsulta(null)
    try {
      const dados = await consultarCnpj(documentoLimpo)
      setConsulta(dados)
      if (dados.ja_cadastrado) {
        const papeis = sincronizarPapeisExistente(dados)
        setEhCliente(papeis.ehCliente)
        setEhFornecedor(papeis.ehFornecedor)
        setEhParceiro(papeis.ehParceiro)
      }
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Consulta CNPJ',
        message: extrairMensagemErroApi(err) || 'Não foi possível consultar o CNPJ.',
      })
    } finally {
      setConsultando(false)
    }
  }, [documentoLimpo, podeConsultar, showToast])

  function aplicarNoFormulario() {
    if (!consulta) return
    onAplicarFormulario({
      documento: consulta.documento,
      razao_social: consulta.razao_social,
      nome_fantasia: consulta.nome_fantasia,
      email: consulta.email,
      telefone: consulta.telefone,
      inscricao_estadual: '',
      endereco: consulta.endereco,
    })
    showToast({ variant: 'success', message: 'Dados aplicados ao formulário de cadastro.' })
  }

  async function salvarCadastro() {
    if (!consulta || !podeSalvar) return
    setSalvando(true)
    try {
      const resultado = await salvarParceiroPorCnpj(consulta.documento, {
        eh_cliente: ehCliente,
        eh_fornecedor: ehFornecedor,
        eh_parceiro: ehParceiro,
        email: consulta.email,
        telefone: consulta.telefone,
        razao_social: consulta.razao_social,
        nome_fantasia: consulta.nome_fantasia,
      })
      if (resultado.aviso) {
        showToast({ variant: 'warning', title: 'Cadastro salvo', message: resultado.aviso })
      } else {
        showToast({ variant: 'success', message: 'Parceiro cadastrado a partir do CNPJ.' })
      }
      onSalvo(resultado.parceiro)
      setConsulta({
        ...resultado.consulta,
        ja_cadastrado: true,
        parceiro_existente_id: resultado.parceiro.id,
        parceiro_existente_nome: resultado.parceiro.razao_social,
        parceiro_existente_eh_cliente: resultado.parceiro.eh_cliente,
        parceiro_existente_eh_fornecedor: resultado.parceiro.eh_fornecedor,
        parceiro_existente_eh_parceiro: resultado.parceiro.eh_parceiro,
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Salvar CNPJ',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar o cadastro.',
      })
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarCadastro() {
    if (!consulta || !parceiroIdAtualizar || !podeAtualizar) return
    setAtualizando(true)
    try {
      const resultado = await atualizarParceiroPorCnpj(consulta.documento, {
        parceiro_id: parceiroIdAtualizar,
        eh_cliente: ehCliente,
        eh_fornecedor: ehFornecedor,
        eh_parceiro: ehParceiro,
        email: consulta.email,
        telefone: consulta.telefone,
        razao_social: consulta.razao_social,
        nome_fantasia: consulta.nome_fantasia,
      })
      if (resultado.aviso) {
        showToast({ variant: 'warning', title: 'Cadastro atualizado', message: resultado.aviso })
      } else {
        showToast({
          variant: 'success',
          message: 'Dados da Receita aplicados ao cadastro existente.',
        })
      }
      onSalvo(resultado.parceiro)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Atualizar CNPJ',
        message: extrairMensagemErroApi(err) || 'Não foi possível atualizar o cadastro.',
      })
    } finally {
      setAtualizando(false)
    }
  }

  return (
    <section className="card shadow-sm border-0 mb-4">
      <div className="card-body">
        <h2 className="h5 card-title">Consulta CNPJ (Receita Federal)</h2>
        <p className="text-muted small mb-3">
          Busque dados na Receita para conferir ou cadastrar clientes e fornecedores. A consulta é feita
          pelo servidor (Brasil API).
        </p>

        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-6 col-lg-5">
            <label className="form-label" htmlFor="cad-cnpj-consulta">
              CNPJ
            </label>
            <input
              id="cad-cnpj-consulta"
              className="form-control"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={cnpjInput}
              onChange={(e) => setCnpjInput(aplicarMascaraCnpj(e.target.value))}
              maxLength={18}
            />
          </div>
          <div className="col-md-auto d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={!podeConsultar || consultando}
              onClick={() => void executarConsulta()}
            >
              {consultando ? 'Consultando…' : 'Consultar'}
            </button>
          </div>
        </div>

        {consulta ? (
          <CnpjPreview
            consulta={consulta}
            canEdit={canEdit}
            ehCliente={ehCliente}
            ehFornecedor={ehFornecedor}
            ehParceiro={ehParceiro}
            podeSalvar={Boolean(podeSalvar)}
            podeAtualizar={Boolean(podeAtualizar)}
            salvando={salvando}
            atualizando={atualizando}
            onAplicar={aplicarNoFormulario}
            onSalvar={() => void salvarCadastro()}
            onAtualizar={() => void atualizarCadastro()}
            setEhCliente={setEhCliente}
            setEhFornecedor={setEhFornecedor}
            setEhParceiro={setEhParceiro}
          />
        ) : null}
      </div>
    </section>
  )
}

function CnpjPreview({
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
}: Readonly<{
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
}>) {
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

      {!situacaoAtiva && consulta.situacao_cadastral ? (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          Situação na Receita: <strong>{consulta.situacao_cadastral}</strong>. Avalie antes de
          cadastrar.
        </div>
      ) : null}

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

      {consulta.socios.length > 0 ? (
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
                {consulta.socios.map((s) => (
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
      ) : (
        <p className="small text-muted mb-3">Nenhum sócio retornado na consulta.</p>
      )}

      {canEdit ? (
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
            {!modoAtualizar ? (
              <button type="button" className="btn btn-outline-secondary" onClick={onAplicar}>
                Usar no formulário
              </button>
            ) : null}
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
      ) : null}
    </div>
  )
}

