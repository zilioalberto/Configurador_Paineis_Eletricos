import { type FormEventHandler, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import {
  atualizarContatoParceiro,
  atualizarEnderecoParceiro,
  atualizarParceiro,
  criarContatoParceiro,
  criarEnderecoParceiro,
  criarParceiro,
  excluirContatoParceiro,
  excluirEnderecoParceiro,
  excluirParceiro,
  listarParceiros,
  obterParceiro,
} from '../services/cadastrosApi'
import type {
  ContatoParceiroDto,
  ContatoParceiroPayload,
  EnderecoParceiroDto,
  EnderecoParceiroPayload,
  OrigemCadastroParceiro,
  ParceiroAtivoFiltro,
  ParceiroComercialDto,
  ParceiroComercialPayload,
  ParceiroTipoFiltro,
  TipoPessoaParceiro,
} from '../types/cadastros'

type ParceiroFormState = {
  tipo_pessoa: TipoPessoaParceiro
  documento: string
  razao_social: string
  nome_fantasia: string
  inscricao_estadual: string
  email: string
  telefone: string
  eh_cliente: boolean
  eh_fornecedor: boolean
  eh_parceiro: boolean
  ativo: boolean
  origem: OrigemCadastroParceiro
}

type ContatoFormState = {
  nome: string
  cargo: string
  email: string
  telefone: string
  principal: boolean
  observacoes: string
}

type EnderecoFormState = {
  nome: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  principal: boolean
}

type DeleteTarget = {
  kind: 'parceiro' | 'contato' | 'endereco'
  id: string
  label: string
}

const parceiroFormVazio: ParceiroFormState = {
  tipo_pessoa: 'PJ',
  documento: '',
  razao_social: '',
  nome_fantasia: '',
  inscricao_estadual: '',
  email: '',
  telefone: '',
  eh_cliente: true,
  eh_fornecedor: false,
  eh_parceiro: false,
  ativo: true,
  origem: 'MANUAL',
}

const contatoFormVazio: ContatoFormState = {
  nome: '',
  cargo: '',
  email: '',
  telefone: '',
  principal: false,
  observacoes: '',
}

const enderecoFormVazio: EnderecoFormState = {
  nome: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  uf: '',
  cep: '',
  principal: false,
}

const tipoPessoaLabels: Record<TipoPessoaParceiro, string> = {
  PJ: 'Pessoa jurídica',
  PF: 'Pessoa física',
  EX: 'Estrangeiro',
}

const origemLabels: Record<OrigemCadastroParceiro, string> = {
  MANUAL: 'Manual',
  NFE: 'NF-e',
  IMPORTACAO: 'Importação',
}

function parceiroParaForm(p: ParceiroComercialDto): ParceiroFormState {
  return {
    tipo_pessoa: p.tipo_pessoa,
    documento: p.documento ?? '',
    razao_social: p.razao_social ?? '',
    nome_fantasia: p.nome_fantasia ?? '',
    inscricao_estadual: p.inscricao_estadual ?? '',
    email: p.email ?? '',
    telefone: p.telefone ?? '',
    eh_cliente: Boolean(p.eh_cliente),
    eh_fornecedor: Boolean(p.eh_fornecedor),
    eh_parceiro: Boolean(p.eh_parceiro),
    ativo: Boolean(p.ativo),
    origem: p.origem ?? 'MANUAL',
  }
}

function contatoParaForm(c: ContatoParceiroDto): ContatoFormState {
  return {
    nome: c.nome ?? '',
    cargo: c.cargo ?? '',
    email: c.email ?? '',
    telefone: c.telefone ?? '',
    principal: Boolean(c.principal),
    observacoes: c.observacoes ?? '',
  }
}

function enderecoParaForm(e: EnderecoParceiroDto): EnderecoFormState {
  return {
    nome: e.nome ?? '',
    logradouro: e.logradouro ?? '',
    numero: e.numero ?? '',
    complemento: e.complemento ?? '',
    bairro: e.bairro ?? '',
    municipio: e.municipio ?? '',
    uf: e.uf ?? '',
    cep: e.cep ?? '',
    principal: Boolean(e.principal),
  }
}

function parceiroPayload(form: ParceiroFormState): ParceiroComercialPayload {
  return {
    tipo_pessoa: form.tipo_pessoa,
    documento: form.documento.trim(),
    razao_social: form.razao_social.trim(),
    nome_fantasia: form.nome_fantasia.trim(),
    inscricao_estadual: form.inscricao_estadual.trim(),
    email: form.email.trim(),
    telefone: form.telefone.trim(),
    eh_cliente: form.eh_cliente,
    eh_fornecedor: form.eh_fornecedor,
    eh_parceiro: form.eh_parceiro,
    ativo: form.ativo,
    origem: form.origem,
  }
}

function contatoPayload(parceiroId: string, form: ContatoFormState): ContatoParceiroPayload {
  return {
    parceiro: parceiroId,
    nome: form.nome.trim(),
    cargo: form.cargo.trim(),
    email: form.email.trim(),
    telefone: form.telefone.trim(),
    principal: form.principal,
    observacoes: form.observacoes.trim(),
  }
}

function enderecoPayload(parceiroId: string, form: EnderecoFormState): EnderecoParceiroPayload {
  return {
    parceiro: parceiroId,
    nome: form.nome.trim(),
    logradouro: form.logradouro.trim(),
    numero: form.numero.trim(),
    complemento: form.complemento.trim(),
    bairro: form.bairro.trim(),
    municipio: form.municipio.trim(),
    uf: form.uf.trim().toUpperCase(),
    cep: form.cep.replace(/\D/g, ''),
    principal: form.principal,
  }
}

function rolesParceiro(p: ParceiroComercialDto | ParceiroFormState): string[] {
  return [
    ...(p.eh_cliente ? ['Cliente'] : []),
    ...(p.eh_fornecedor ? ['Fornecedor'] : []),
    ...(p.eh_parceiro ? ['Parceiro'] : []),
  ]
}

export default function CadastrosPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canEdit = hasPermission(user, PERMISSION_KEYS.CADASTRO_EDITAR)

  const [lista, setLista] = useState<ParceiroComercialDto[]>([])
  const [selecionado, setSelecionado] = useState<ParceiroComercialDto | null>(null)
  const [modoNovo, setModoNovo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [salvandoParceiro, setSalvandoParceiro] = useState(false)
  const [salvandoContato, setSalvandoContato] = useState(false)
  const [salvandoEndereco, setSalvandoEndereco] = useState(false)
  const [confirmandoDelete, setConfirmandoDelete] = useState(false)

  const [tipoFiltro, setTipoFiltro] = useState<ParceiroTipoFiltro>('')
  const [ativoFiltro, setAtivoFiltro] = useState<ParceiroAtivoFiltro>('1')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')

  const [form, setForm] = useState<ParceiroFormState>(parceiroFormVazio)
  const [contatoForm, setContatoForm] = useState<ContatoFormState>(contatoFormVazio)
  const [enderecoForm, setEnderecoForm] = useState<EnderecoFormState>(enderecoFormVazio)
  const [contatoEditId, setContatoEditId] = useState<string | null>(null)
  const [enderecoEditId, setEnderecoEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const recarregarLista = useCallback(
    async (selecionarId?: string) => {
      setCarregando(true)
      try {
        const dados = await listarParceiros({
          tipo: tipoFiltro,
          ativo: ativoFiltro,
          search: buscaAplicada,
        })
        setLista(dados)
        if (selecionarId) {
          const item = dados.find((p) => p.id === selecionarId)
          if (item) {
            setSelecionado(item)
            setForm(parceiroParaForm(item))
            setModoNovo(false)
          }
        }
      } catch (err) {
        showToast({
          variant: 'danger',
          title: 'Cadastros',
          message: extrairMensagemErroApi(err) || 'Não foi possível carregar os cadastros.',
        })
      } finally {
        setCarregando(false)
      }
    },
    [ativoFiltro, buscaAplicada, showToast, tipoFiltro]
  )

  useEffect(() => {
    void recarregarLista()
  }, [recarregarLista])

  const selecionarParceiro = useCallback(
    async (id: string) => {
      setCarregandoDetalhe(true)
      try {
        const dados = await obterParceiro(id)
        setSelecionado(dados)
        setForm(parceiroParaForm(dados))
        setModoNovo(false)
        setContatoEditId(null)
        setContatoForm(contatoFormVazio)
        setEnderecoEditId(null)
        setEnderecoForm(enderecoFormVazio)
      } catch (err) {
        showToast({
          variant: 'danger',
          title: 'Cadastro',
          message: extrairMensagemErroApi(err) || 'Não foi possível abrir o cadastro.',
        })
      } finally {
        setCarregandoDetalhe(false)
      }
    },
    [showToast]
  )

  const recarregarSelecionado = useCallback(
    async (id: string) => {
      const atualizado = await obterParceiro(id)
      setSelecionado(atualizado)
      setForm(parceiroParaForm(atualizado))
      await recarregarLista(id)
    },
    [recarregarLista]
  )

  function iniciarNovo() {
    setSelecionado(null)
    setModoNovo(true)
    setForm(parceiroFormVazio)
    setContatoEditId(null)
    setContatoForm(contatoFormVazio)
    setEnderecoEditId(null)
    setEnderecoForm(enderecoFormVazio)
  }

  const handleFiltroSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    setBuscaAplicada(busca.trim())
  }

  function limparBusca() {
    setBusca('')
    setBuscaAplicada('')
  }

  const parceiroFormValido = useMemo(
    () =>
      Boolean(form.documento.trim()) &&
      Boolean(form.razao_social.trim()) &&
      rolesParceiro(form).length > 0,
    [form]
  )

  const salvarParceiro: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void salvarParceiroAsync()
  }

  async function salvarParceiroAsync() {
    if (!canEdit || !parceiroFormValido) return
    setSalvandoParceiro(true)
    try {
      const payload = parceiroPayload(form)
      const salvo =
        modoNovo || !selecionado
          ? await criarParceiro(payload)
          : await atualizarParceiro(selecionado.id, payload)
      setSelecionado(salvo)
      setForm(parceiroParaForm(salvo))
      setModoNovo(false)
      await recarregarLista(salvo.id)
      showToast({ variant: 'success', message: 'Cadastro salvo.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        message: extrairMensagemErroApi(err) || 'Revise os dados e tente novamente.',
      })
    } finally {
      setSalvandoParceiro(false)
    }
  }

  const salvarContato: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void salvarContatoAsync()
  }

  async function salvarContatoAsync() {
    if (!canEdit || !selecionado || !contatoForm.nome.trim()) return
    setSalvandoContato(true)
    try {
      const payload = contatoPayload(selecionado.id, contatoForm)
      if (contatoEditId) {
        await atualizarContatoParceiro(contatoEditId, payload)
      } else {
        await criarContatoParceiro(payload)
      }
      setContatoEditId(null)
      setContatoForm(contatoFormVazio)
      await recarregarSelecionado(selecionado.id)
      showToast({ variant: 'success', message: 'Contato salvo.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Contato',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar o contato.',
      })
    } finally {
      setSalvandoContato(false)
    }
  }

  const salvarEndereco: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void salvarEnderecoAsync()
  }

  async function salvarEnderecoAsync() {
    if (!canEdit || !selecionado) return
    setSalvandoEndereco(true)
    try {
      const payload = enderecoPayload(selecionado.id, enderecoForm)
      if (enderecoEditId) {
        await atualizarEnderecoParceiro(enderecoEditId, payload)
      } else {
        await criarEnderecoParceiro(payload)
      }
      setEnderecoEditId(null)
      setEnderecoForm(enderecoFormVazio)
      await recarregarSelecionado(selecionado.id)
      showToast({ variant: 'success', message: 'Endereço salvo.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Endereço',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar o endereço.',
      })
    } finally {
      setSalvandoEndereco(false)
    }
  }

  function editarContato(contato: ContatoParceiroDto) {
    setContatoEditId(contato.id)
    setContatoForm(contatoParaForm(contato))
  }

  function editarEndereco(endereco: EnderecoParceiroDto) {
    setEnderecoEditId(endereco.id)
    setEnderecoForm(enderecoParaForm(endereco))
  }

  async function confirmarExclusao() {
    if (!deleteTarget) return
    setConfirmandoDelete(true)
    try {
      if (deleteTarget.kind === 'parceiro') {
        await excluirParceiro(deleteTarget.id)
        setSelecionado(null)
        setModoNovo(false)
        setForm(parceiroFormVazio)
        await recarregarLista()
      }
      if (deleteTarget.kind === 'contato' && selecionado) {
        await excluirContatoParceiro(deleteTarget.id)
        await recarregarSelecionado(selecionado.id)
      }
      if (deleteTarget.kind === 'endereco' && selecionado) {
        await excluirEnderecoParceiro(deleteTarget.id)
        await recarregarSelecionado(selecionado.id)
      }
      setDeleteTarget(null)
      showToast({ variant: 'success', message: 'Registro excluído.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: extrairMensagemErroApi(err) || 'Verifique vínculos existentes e tente novamente.',
      })
    } finally {
      setConfirmandoDelete(false)
    }
  }

  const contatos = selecionado?.contatos ?? []
  const enderecos = selecionado?.enderecos ?? []

  return (
    <div className="container-fluid py-4">
      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir registro"
        message={
          deleteTarget
            ? `Deseja excluir "${deleteTarget.label}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={confirmandoDelete}
        onCancel={() => {
          if (!confirmandoDelete) setDeleteTarget(null)
        }}
        onConfirm={() => void confirmarExclusao()}
      />

      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Módulos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Cadastros
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Cadastros</h1>
          <p className="text-muted mb-0">Clientes, fornecedores, contatos e endereços.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void recarregarLista(selecionado?.id)}
            disabled={carregando}
          >
            Atualizar
          </button>
          {canEdit ? (
            <button type="button" className="btn btn-primary" onClick={iniciarNovo}>
              Novo cadastro
            </button>
          ) : null}
        </div>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-xl-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <form className="row g-2 align-items-end mb-3" onSubmit={handleFiltroSubmit}>
                <div className="col-12">
                  <label className="form-label" htmlFor="cad-busca">
                    Buscar
                  </label>
                  <input
                    id="cad-busca"
                    className="form-control"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Razão social, documento ou email"
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="cad-tipo">
                    Tipo
                  </label>
                  <select
                    id="cad-tipo"
                    className="form-select"
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value as ParceiroTipoFiltro)}
                  >
                    <option value="">Todos</option>
                    <option value="cliente">Clientes</option>
                    <option value="fornecedor">Fornecedores</option>
                    <option value="parceiro">Parceiros</option>
                  </select>
                </div>
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="cad-ativo">
                    Situação
                  </label>
                  <select
                    id="cad-ativo"
                    className="form-select"
                    value={ativoFiltro}
                    onChange={(e) => setAtivoFiltro(e.target.value as ParceiroAtivoFiltro)}
                  >
                    <option value="">Todos</option>
                    <option value="1">Ativos</option>
                    <option value="0">Inativos</option>
                  </select>
                </div>
                <div className="col-12 d-flex flex-wrap gap-2">
                  <button type="submit" className="btn btn-outline-primary">
                    Buscar
                  </button>
                  {buscaAplicada ? (
                    <button type="button" className="btn btn-outline-secondary" onClick={limparBusca}>
                      Limpar
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                <h2 className="h5 mb-0">Parceiros comerciais</h2>
                <span className="badge text-bg-light">{lista.length}</span>
              </div>

              {carregando ? (
                <p className="text-muted mb-0">Carregando…</p>
              ) : lista.length === 0 ? (
                <p className="text-muted mb-0">Nenhum cadastro encontrado.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Documento</th>
                        <th>Classificação</th>
                        <th>Contato</th>
                        <th aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((p) => (
                        <tr key={p.id} className={selecionado?.id === p.id ? 'table-active' : ''}>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-start align-baseline"
                              onClick={() => void selecionarParceiro(p.id)}
                            >
                              {p.razao_social}
                            </button>
                            {p.ativo ? null : (
                              <span className="badge text-bg-secondary ms-2">Inativo</span>
                            )}
                            {p.nome_fantasia ? (
                              <div className="small text-muted">{p.nome_fantasia}</div>
                            ) : null}
                          </td>
                          <td>{p.documento}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {rolesParceiro(p).map((role) => (
                                <span key={role} className="badge text-bg-light">
                                  {role}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{p.email || p.telefone || '—'}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => void selecionarParceiro(p.id)}
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card shadow-sm">
            <div className="card-body">
              {!modoNovo && !selecionado ? (
                <p className="text-muted mb-0">Selecione um cadastro ou crie um novo registro.</p>
              ) : (
                <>
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                    <div>
                      <h2 className="h5 mb-1">
                        {modoNovo ? 'Novo cadastro' : selecionado?.razao_social}
                      </h2>
                      {selecionado ? (
                        <p className="small text-muted mb-0">
                          {tipoPessoaLabels[selecionado.tipo_pessoa]} · Origem{' '}
                          {origemLabels[selecionado.origem]}
                        </p>
                      ) : null}
                    </div>
                    {canEdit && selecionado ? (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() =>
                          setDeleteTarget({
                            kind: 'parceiro',
                            id: selecionado.id,
                            label: selecionado.razao_social,
                          })
                        }
                      >
                        Excluir
                      </button>
                    ) : null}
                  </div>

                  {carregandoDetalhe ? (
                    <p className="text-muted">Carregando cadastro…</p>
                  ) : null}

                  <form onSubmit={(e) => void salvarParceiro(e)}>
                    <fieldset disabled={!canEdit || salvandoParceiro}>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label" htmlFor="cad-form-tipo-pessoa">
                            Pessoa
                          </label>
                          <select
                            id="cad-form-tipo-pessoa"
                            className="form-select"
                            value={form.tipo_pessoa}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                tipo_pessoa: e.target.value as TipoPessoaParceiro,
                              }))
                            }
                          >
                            <option value="PJ">Pessoa jurídica</option>
                            <option value="PF">Pessoa física</option>
                            <option value="EX">Estrangeiro</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label" htmlFor="cad-form-documento">
                            Documento
                          </label>
                          <input
                            id="cad-form-documento"
                            className="form-control"
                            value={form.documento}
                            onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                            maxLength={20}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label" htmlFor="cad-form-ie">
                            Inscrição estadual
                          </label>
                          <input
                            id="cad-form-ie"
                            className="form-control"
                            value={form.inscricao_estadual}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))
                            }
                            maxLength={20}
                          />
                        </div>
                        <div className="col-md-8">
                          <label className="form-label" htmlFor="cad-form-razao">
                            Razão social
                          </label>
                          <input
                            id="cad-form-razao"
                            className="form-control"
                            value={form.razao_social}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, razao_social: e.target.value }))
                            }
                            maxLength={255}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label" htmlFor="cad-form-fantasia">
                            Nome fantasia
                          </label>
                          <input
                            id="cad-form-fantasia"
                            className="form-control"
                            value={form.nome_fantasia}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, nome_fantasia: e.target.value }))
                            }
                            maxLength={255}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="cad-form-email">
                            Email
                          </label>
                          <input
                            id="cad-form-email"
                            className="form-control"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" htmlFor="cad-form-telefone">
                            Telefone
                          </label>
                          <input
                            id="cad-form-telefone"
                            className="form-control"
                            value={form.telefone}
                            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                            maxLength={30}
                          />
                        </div>
                        <div className="col-12">
                          <div className="d-flex flex-wrap gap-3">
                            <div className="form-check">
                              <input
                                id="cad-form-cliente"
                                className="form-check-input"
                                type="checkbox"
                                checked={form.eh_cliente}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, eh_cliente: e.target.checked }))
                                }
                              />
                              <label className="form-check-label" htmlFor="cad-form-cliente">
                                Cliente
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                id="cad-form-fornecedor"
                                className="form-check-input"
                                type="checkbox"
                                checked={form.eh_fornecedor}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, eh_fornecedor: e.target.checked }))
                                }
                              />
                              <label className="form-check-label" htmlFor="cad-form-fornecedor">
                                Fornecedor
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                id="cad-form-parceiro"
                                className="form-check-input"
                                type="checkbox"
                                checked={form.eh_parceiro}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, eh_parceiro: e.target.checked }))
                                }
                              />
                              <label className="form-check-label" htmlFor="cad-form-parceiro">
                                Parceiro comercial
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                id="cad-form-ativo"
                                className="form-check-input"
                                type="checkbox"
                                checked={form.ativo}
                                onChange={(e) =>
                                  setForm((f) => ({ ...f, ativo: e.target.checked }))
                                }
                              />
                              <label className="form-check-label" htmlFor="cad-form-ativo">
                                Ativo
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </fieldset>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {canEdit ? (
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={salvandoParceiro || !parceiroFormValido}
                        >
                          {salvandoParceiro ? 'Salvando…' : 'Salvar cadastro'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          if (selecionado) {
                            setForm(parceiroParaForm(selecionado))
                            setModoNovo(false)
                          } else {
                            setModoNovo(false)
                          }
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>

                  {selecionado && !modoNovo ? (
                    <>
                      <section className="border-top pt-4 mt-4">
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                          <h3 className="h6 mb-0">Contatos</h3>
                          {contatoEditId ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                setContatoEditId(null)
                                setContatoForm(contatoFormVazio)
                              }}
                            >
                              Novo contato
                            </button>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <form className="row g-2 mb-3" onSubmit={(e) => void salvarContato(e)}>
                            <div className="col-md-5">
                              <label className="form-label" htmlFor="cad-contato-nome">
                                Nome
                              </label>
                              <input
                                id="cad-contato-nome"
                                className="form-control"
                                value={contatoForm.nome}
                                onChange={(e) =>
                                  setContatoForm((f) => ({ ...f, nome: e.target.value }))
                                }
                                maxLength={120}
                                required
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label" htmlFor="cad-contato-cargo">
                                Cargo
                              </label>
                              <input
                                id="cad-contato-cargo"
                                className="form-control"
                                value={contatoForm.cargo}
                                onChange={(e) =>
                                  setContatoForm((f) => ({ ...f, cargo: e.target.value }))
                                }
                                maxLength={80}
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label" htmlFor="cad-contato-email">
                                Email
                              </label>
                              <input
                                id="cad-contato-email"
                                className="form-control"
                                type="email"
                                value={contatoForm.email}
                                onChange={(e) =>
                                  setContatoForm((f) => ({ ...f, email: e.target.value }))
                                }
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label" htmlFor="cad-contato-telefone">
                                Telefone
                              </label>
                              <input
                                id="cad-contato-telefone"
                                className="form-control"
                                value={contatoForm.telefone}
                                onChange={(e) =>
                                  setContatoForm((f) => ({ ...f, telefone: e.target.value }))
                                }
                                maxLength={30}
                              />
                            </div>
                            <div className="col-md-5">
                              <label className="form-label" htmlFor="cad-contato-obs">
                                Observações
                              </label>
                              <input
                                id="cad-contato-obs"
                                className="form-control"
                                value={contatoForm.observacoes}
                                onChange={(e) =>
                                  setContatoForm((f) => ({ ...f, observacoes: e.target.value }))
                                }
                              />
                            </div>
                            <div className="col-md-3 d-flex align-items-end">
                              <div className="form-check mb-2">
                                <input
                                  id="cad-contato-principal"
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={contatoForm.principal}
                                  onChange={(e) =>
                                    setContatoForm((f) => ({
                                      ...f,
                                      principal: e.target.checked,
                                    }))
                                  }
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor="cad-contato-principal"
                                >
                                  Principal
                                </label>
                              </div>
                            </div>
                            <div className="col-12">
                              <button
                                type="submit"
                                className="btn btn-outline-primary"
                                disabled={salvandoContato || !contatoForm.nome.trim()}
                              >
                                {salvandoContato ? 'Salvando…' : contatoEditId ? 'Salvar contato' : 'Adicionar contato'}
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {contatos.length === 0 ? (
                          <p className="text-muted mb-0">Nenhum contato cadastrado.</p>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm align-middle">
                              <thead>
                                <tr>
                                  <th>Nome</th>
                                  <th>Cargo</th>
                                  <th>Email</th>
                                  <th>Telefone</th>
                                  <th aria-label="Ações" />
                                </tr>
                              </thead>
                              <tbody>
                                {contatos.map((contato) => (
                                  <tr key={contato.id}>
                                    <td>
                                      {contato.nome}
                                      {contato.principal ? (
                                        <span className="badge text-bg-light ms-2">Principal</span>
                                      ) : null}
                                    </td>
                                    <td>{contato.cargo || '—'}</td>
                                    <td>{contato.email || '—'}</td>
                                    <td>{contato.telefone || '—'}</td>
                                    <td className="text-end">
                                      {canEdit ? (
                                        <div className="btn-group btn-group-sm">
                                          <button
                                            type="button"
                                            className="btn btn-outline-primary"
                                            onClick={() => editarContato(contato)}
                                          >
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-outline-danger"
                                            onClick={() =>
                                              setDeleteTarget({
                                                kind: 'contato',
                                                id: contato.id,
                                                label: contato.nome,
                                              })
                                            }
                                          >
                                            Excluir
                                          </button>
                                        </div>
                                      ) : null}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      <section className="border-top pt-4 mt-4">
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                          <h3 className="h6 mb-0">Endereços</h3>
                          {enderecoEditId ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                setEnderecoEditId(null)
                                setEnderecoForm(enderecoFormVazio)
                              }}
                            >
                              Novo endereço
                            </button>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <form className="row g-2 mb-3" onSubmit={(e) => void salvarEndereco(e)}>
                            <div className="col-md-3">
                              <label className="form-label" htmlFor="cad-end-nome">
                                Nome
                              </label>
                              <input
                                id="cad-end-nome"
                                className="form-control"
                                value={enderecoForm.nome}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({ ...f, nome: e.target.value }))
                                }
                                maxLength={80}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label" htmlFor="cad-end-logradouro">
                                Logradouro
                              </label>
                              <input
                                id="cad-end-logradouro"
                                className="form-control"
                                value={enderecoForm.logradouro}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({ ...f, logradouro: e.target.value }))
                                }
                                maxLength={255}
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label" htmlFor="cad-end-numero">
                                Número
                              </label>
                              <input
                                id="cad-end-numero"
                                className="form-control"
                                value={enderecoForm.numero}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({ ...f, numero: e.target.value }))
                                }
                                maxLength={20}
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label" htmlFor="cad-end-complemento">
                                Complemento
                              </label>
                              <input
                                id="cad-end-complemento"
                                className="form-control"
                                value={enderecoForm.complemento}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({ ...f, complemento: e.target.value }))
                                }
                                maxLength={120}
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label" htmlFor="cad-end-bairro">
                                Bairro
                              </label>
                              <input
                                id="cad-end-bairro"
                                className="form-control"
                                value={enderecoForm.bairro}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({ ...f, bairro: e.target.value }))
                                }
                                maxLength={120}
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label" htmlFor="cad-end-municipio">
                                Município
                              </label>
                              <input
                                id="cad-end-municipio"
                                className="form-control"
                                value={enderecoForm.municipio}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({ ...f, municipio: e.target.value }))
                                }
                                maxLength={120}
                              />
                            </div>
                            <div className="col-md-2">
                              <label className="form-label" htmlFor="cad-end-uf">
                                UF
                              </label>
                              <input
                                id="cad-end-uf"
                                className="form-control text-uppercase"
                                value={enderecoForm.uf}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({
                                    ...f,
                                    uf: e.target.value.toUpperCase(),
                                  }))
                                }
                                maxLength={2}
                              />
                            </div>
                            <div className="col-md-3">
                              <label className="form-label" htmlFor="cad-end-cep">
                                CEP
                              </label>
                              <input
                                id="cad-end-cep"
                                className="form-control"
                                value={enderecoForm.cep}
                                onChange={(e) =>
                                  setEnderecoForm((f) => ({ ...f, cep: e.target.value }))
                                }
                                maxLength={8}
                              />
                            </div>
                            <div className="col-md-3 d-flex align-items-end">
                              <div className="form-check mb-2">
                                <input
                                  id="cad-end-principal"
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={enderecoForm.principal}
                                  onChange={(e) =>
                                    setEnderecoForm((f) => ({
                                      ...f,
                                      principal: e.target.checked,
                                    }))
                                  }
                                />
                                <label className="form-check-label" htmlFor="cad-end-principal">
                                  Principal
                                </label>
                              </div>
                            </div>
                            <div className="col-md-4 d-flex align-items-end">
                              <button
                                type="submit"
                                className="btn btn-outline-primary"
                                disabled={salvandoEndereco}
                              >
                                {salvandoEndereco ? 'Salvando…' : enderecoEditId ? 'Salvar endereço' : 'Adicionar endereço'}
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {enderecos.length === 0 ? (
                          <p className="text-muted mb-0">Nenhum endereço cadastrado.</p>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm align-middle">
                              <thead>
                                <tr>
                                  <th>Nome</th>
                                  <th>Endereço</th>
                                  <th>Cidade</th>
                                  <th>CEP</th>
                                  <th aria-label="Ações" />
                                </tr>
                              </thead>
                              <tbody>
                                {enderecos.map((endereco) => (
                                  <tr key={endereco.id}>
                                    <td>
                                      {endereco.nome || 'Endereço'}
                                      {endereco.principal ? (
                                        <span className="badge text-bg-light ms-2">Principal</span>
                                      ) : null}
                                    </td>
                                    <td>
                                      {[
                                        endereco.logradouro,
                                        endereco.numero,
                                        endereco.complemento,
                                        endereco.bairro,
                                      ]
                                        .filter(Boolean)
                                        .join(', ') || '—'}
                                    </td>
                                    <td>
                                      {[endereco.municipio, endereco.uf].filter(Boolean).join(' / ') ||
                                        '—'}
                                    </td>
                                    <td>{endereco.cep || '—'}</td>
                                    <td className="text-end">
                                      {canEdit ? (
                                        <div className="btn-group btn-group-sm">
                                          <button
                                            type="button"
                                            className="btn btn-outline-primary"
                                            onClick={() => editarEndereco(endereco)}
                                          >
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-outline-danger"
                                            onClick={() =>
                                              setDeleteTarget({
                                                kind: 'endereco',
                                                id: endereco.id,
                                                label: endereco.nome || endereco.municipio || 'endereço',
                                              })
                                            }
                                          >
                                            Excluir
                                          </button>
                                        </div>
                                      ) : null}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
