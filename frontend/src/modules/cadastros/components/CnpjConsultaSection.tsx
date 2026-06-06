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
import CnpjPreview from './CnpjPreview'

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
              onClick={() => {
                executarConsulta().catch(() => undefined)
              }}
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
            onSalvar={() => {
              salvarCadastro().catch(() => undefined)
            }}
            onAtualizar={() => {
              atualizarCadastro().catch(() => undefined)
            }}
            setEhCliente={setEhCliente}
            setEhFornecedor={setEhFornecedor}
            setEhParceiro={setEhParceiro}
          />
        ) : null}
      </div>
    </section>
  )
}
