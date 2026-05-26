import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import ConfiguradorPaineisConfigTab from '../components/ConfiguradorPaineisConfigTab'
import ParametrosErpTable from '../components/ParametrosErpTable'
import { PREFIXO_PARAMETRO_CONFIGURADOR } from '../configuradorParametros'
import { atualizarParametroConfiguracao, listarParametrosConfiguracao } from '../services/erpApi'
import type { ParametroConfiguracaoDto } from '../types/erp'

type AbaConfig = 'geral' | 'configurador'

/** Edição de parâmetros globais do ERP (requer permissão de gerenciamento). */
export default function ConfiguracoesErpPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const podeGerenciar = hasPermission(user, PERMISSION_KEYS.CONFIGURACAO_ERP_GERENCIAR)

  const [lista, setLista] = useState<ParametroConfiguracaoDto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<AbaConfig>('configurador')
  const [editandoChave, setEditandoChave] = useState<string | null>(null)
  const [valorRascunho, setValorRascunho] = useState('')
  const [descricaoRascunho, setDescricaoRascunho] = useState('')
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null)

  const parametrosConfigurador = useMemo(
    () => lista.filter((p) => p.chave.startsWith(PREFIXO_PARAMETRO_CONFIGURADOR)),
    [lista]
  )

  const tabelaGeral = useMemo(
    () => lista.filter((p) => !p.chave.startsWith(PREFIXO_PARAMETRO_CONFIGURADOR)),
    [lista]
  )

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await listarParametrosConfiguracao()
      setLista(dados)
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível carregar os parâmetros.',
      })
    } finally {
      setCarregando(false)
    }
  }, [showToast])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  function iniciarEdicao(p: ParametroConfiguracaoDto) {
    setEditandoChave(p.chave)
    setValorRascunho(p.valor ?? '')
    setDescricaoRascunho(p.descricao ?? '')
  }

  function cancelarEdicao() {
    setEditandoChave(null)
    setValorRascunho('')
    setDescricaoRascunho('')
  }

  async function guardarParametro(chave: string) {
    setSalvandoChave(chave)
    try {
      const atualizado = await atualizarParametroConfiguracao(chave, {
        valor: valorRascunho,
        descricao: descricaoRascunho.trim(),
      })
      setLista((rows) => rows.map((r) => (r.chave === chave ? atualizado : r)))
      cancelarEdicao()
      showToast({ variant: 'success', message: 'Parâmetro atualizado.' })
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro',
        message: 'Não foi possível guardar o parâmetro.',
      })
    } finally {
      setSalvandoChave(null)
    }
  }

  function handleParamAtualizado(param: ParametroConfiguracaoDto) {
    setLista((rows) => rows.map((r) => (r.chave === param.chave ? param : r)))
  }

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Módulos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Configurações do ERP
          </li>
        </ol>
      </nav>

      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="h4">Configurações do ERP</h1>
          <p className="text-muted">
            Parâmetros globais do sistema.
            {podeGerenciar ? ' Pode editar conforme a aba.' : ' Só visualização.'}
          </p>

          <ul className="nav nav-tabs mb-3" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                className={`nav-link${aba === 'configurador' ? ' active' : ''}`}
                aria-selected={aba === 'configurador'}
                onClick={() => setAba('configurador')}
              >
                Configurador de painéis
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                className={`nav-link${aba === 'geral' ? ' active' : ''}`}
                aria-selected={aba === 'geral'}
                onClick={() => setAba('geral')}
              >
                Parâmetros gerais
              </button>
            </li>
          </ul>

          {carregando ? (
            <p className="text-muted mb-0">A carregar…</p>
          ) : aba === 'configurador' ? (
            <ConfiguradorPaineisConfigTab
              parametros={parametrosConfigurador}
              podeGerenciar={podeGerenciar}
              onAtualizado={handleParamAtualizado}
            />
          ) : (
            <ParametrosErpTable
              lista={tabelaGeral}
              podeGerenciar={podeGerenciar}
              editandoChave={editandoChave}
              valorRascunho={valorRascunho}
              descricaoRascunho={descricaoRascunho}
              salvandoChave={salvandoChave}
              onIniciarEdicao={iniciarEdicao}
              onCancelarEdicao={cancelarEdicao}
              onValorChange={setValorRascunho}
              onDescricaoChange={setDescricaoRascunho}
              onGuardar={(chave) => void guardarParametro(chave)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
