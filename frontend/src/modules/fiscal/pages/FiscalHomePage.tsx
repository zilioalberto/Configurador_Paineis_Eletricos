import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { catalogoPaths } from '@/modules/catalogo/catalogoPaths'
import FiscalNsuStatusCard from '../components/FiscalNsuStatusCard'
import FiscalNfseAdnStatusCard from '../components/FiscalNfseAdnStatusCard'
import FiscalObrigacoesDashboardCard from '../components/FiscalObrigacoesDashboardCard'
import { fiscalPaths } from '../fiscalPaths'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useFiscalProdutoBuscaQuery } from '../hooks/useFiscalProdutoBuscaQuery'

type Atalho = {
  titulo: string
  descricao: string
  to: string
  label: string
  primario?: boolean
  requerEdicao?: boolean
}

type GrupoAtalhos = {
  titulo: string
  itens: Atalho[]
}

function AtalhoCard({ atalho, podeEditar }: Readonly<{ atalho: Atalho; podeEditar: boolean }>) {
  const bloqueado = Boolean(atalho.requerEdicao) && !podeEditar
  const btnClass = atalho.primario ? 'btn btn-primary' : 'btn btn-outline-primary'
  return (
    <div className="col-sm-6 col-lg-4 col-xxl-3">
      <div className="card h-100 shadow-sm">
        <div className="card-body d-flex flex-column">
          <h3 className="h6 card-title mb-1">{atalho.titulo}</h3>
          <p className="card-text text-muted small flex-grow-1">{atalho.descricao}</p>
          {bloqueado ? (
            <span className="small text-muted">Requer permissão de edição fiscal.</span>
          ) : (
            <Link to={atalho.to} className={`${btnClass} btn-sm align-self-start`}>
              {atalho.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/** Página inicial: visão de status, busca de produtos e atalhos organizados. */
export default function FiscalHomePage() {
  const { user } = useAuth()
  const [buscaInput, setBuscaInput] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')

  const podeEditar = hasPermission(user, PERMISSION_KEYS.FISCAL_EDITAR)

  useEffect(() => {
    const t = globalThis.setTimeout(() => setBuscaDebounced(buscaInput.trim()), 350)
    return () => globalThis.clearTimeout(t)
  }, [buscaInput])

  const {
    data: resultados = [],
    isFetching,
    isError,
    error,
    isSuccess,
  } = useFiscalProdutoBuscaQuery(buscaDebounced)

  const onBuscaChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setBuscaInput(e.target.value)
  }, [])

  const mostrarEstadoVazio =
    buscaDebounced.length === 0 ||
    (isSuccess && !isFetching && resultados.length === 0 && buscaDebounced.length >= 1)

  const grupos = useMemo<GrupoAtalhos[]>(
    () => [
      {
        titulo: 'Documentos recebidos e emitidos',
        itens: [
          {
            titulo: 'NF-es recebidas',
            descricao: 'Notas importadas da SEFAZ ou por XML, com itens e objetivo fiscal da entrada.',
            to: fiscalPaths.nfes,
            label: 'Ver documentos',
            primario: true,
          },
          {
            titulo: 'Caixa SEFAZ',
            descricao: 'Resumos da Distribuição DFe aguardando manifestação e importação do XML completo.',
            to: fiscalPaths.sefazDistribuicao,
            label: 'Abrir caixa',
          },
          {
            titulo: 'NFS-es recebidas (serviço)',
            descricao: 'Notas de serviço em que a empresa é tomadora, sincronizadas via ADN.',
            to: fiscalPaths.nfseRecebidas,
            label: 'Ver NFS-es',
          },
          {
            titulo: 'NF-es emitidas',
            descricao: 'Saídas importadas por XML, classificadas por CFOP para compor a RBT12.',
            to: fiscalPaths.nfesEmitidas,
            label: 'Ver emitidas',
          },
        ],
      },
      {
        titulo: 'Impostos e relatórios',
        itens: [
          {
            titulo: 'Obrigações fiscais',
            descricao: 'Guias da contabilidade (DAS, INSS, FGTS, ISS, ICMS), vencimentos e conciliação.',
            to: fiscalPaths.obrigacoes,
            label: 'Gerir impostos',
            primario: true,
          },
          {
            titulo: 'Relatório de NF-es',
            descricao: 'Fechamento por período e finalidade, com fornecedor, valores e itens.',
            to: fiscalPaths.relatorioNfes,
            label: 'Gerar relatório',
          },
          {
            titulo: 'Faturamento por clientes',
            descricao: 'Dashboard de faturamento por mês e por cliente, com base nas NF-es emitidas.',
            to: fiscalPaths.relatorioFaturamento,
            label: 'Ver dashboard',
          },
          {
            titulo: 'Projeção DAS — Simples',
            descricao: 'Estimativa do DAS com base no faturamento dos últimos 12 meses.',
            to: fiscalPaths.projecaoDas,
            label: 'Calcular projeção',
          },
        ],
      },
      {
        titulo: 'Importação e cadastros',
        itens: [
          {
            titulo: 'Importar XML (fiscal)',
            descricao: 'Grava a NF-e no armazenamento fiscal sem alterar produtos; informe o objetivo da entrada.',
            to: fiscalPaths.nfeImportarManual,
            label: 'Enviar XML',
            requerEdicao: true,
          },
          {
            titulo: 'Buscar NF-e por chave',
            descricao: 'Recupera notas retroativas na SEFAZ pela chave de 44 dígitos (sem mexer no NSU).',
            to: fiscalPaths.nfeBuscarChave,
            label: 'Buscar por chave',
            requerEdicao: true,
          },
          {
            titulo: 'Importar XMLs emitidos',
            descricao: 'Envie um ou vários XMLs de saída; a classificação por CFOP é automática.',
            to: fiscalPaths.nfeEmitidaImportar,
            label: 'Importar lote',
            requerEdicao: true,
          },
          {
            titulo: 'Importar NF-e (catálogo)',
            descricao: 'Cria ou atualiza produtos a partir do XML e grava a tributação de referência.',
            to: catalogoPaths.produtoImportarNfe,
            label: 'Ir para catálogo',
          },
          {
            titulo: 'Itens fiscais',
            descricao: 'Lista paginada de todos os registos fiscais, com filtro por produto.',
            to: fiscalPaths.itensFiscais,
            label: 'Abrir lista',
          },
          {
            titulo: 'Catálogo',
            descricao: 'Listagem completa de produtos por categoria.',
            to: catalogoPaths.produtos,
            label: 'Abrir catálogo',
          },
        ],
      },
    ],
    [],
  )

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="h3 mb-1">Fiscal</h1>
        <p className="text-muted mb-0">
          NF-es e NFS-es recebidas, obrigações fiscais e tributação de referência dos produtos —
          tudo armazenado no servidor.
        </p>
      </div>

      <section aria-label="Status" className="row g-3 mb-4">
        <div className="col-12 col-xxl-6">
          <FiscalNsuStatusCard />
          <FiscalNfseAdnStatusCard />
        </div>
        <div className="col-12 col-xxl-6">
          <FiscalObrigacoesDashboardCard />
        </div>
      </section>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <label className="form-label fw-semibold mb-2" htmlFor="fiscal-busca-produto">
            Encontrar produto
          </label>
          <div className="position-relative">
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted" aria-hidden>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="currentColor"
                className="bi bi-search"
                viewBox="0 0 16 16"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
            </span>
            <input
              id="fiscal-busca-produto"
              type="search"
              className="form-control form-control-lg ps-5"
              placeholder="Ex.: código FAB-001, parte da descrição ou fabricante…"
              value={buscaInput}
              onChange={onBuscaChange}
              autoComplete="off"
              aria-describedby="fiscal-busca-produto-ajuda"
            />
          </div>
          <p id="fiscal-busca-produto-ajuda" className="form-text mb-0 mt-2">
            Mesmo critério do catálogo (código, descrição ou fabricante). Até 40 resultados ativos.
          </p>

          {isError && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error instanceof Error ? error.message : 'Não foi possível buscar produtos.'}
            </div>
          )}

          {buscaDebounced.length >= 1 && isFetching && (
            <p className="text-muted small mt-3 mb-0">A procurar…</p>
          )}

          {mostrarEstadoVazio && buscaDebounced.length >= 1 && !isFetching && !isError && (
            <p className="text-muted mt-3 mb-0">Nenhum produto encontrado com este texto.</p>
          )}

          {resultados.length > 0 && (
            <ul className="list-group list-group-flush border rounded mt-3 mb-0" aria-live="polite">
              {resultados.map((p) => (
                <li
                  key={p.id}
                  className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 py-3"
                >
                  <div className="min-w-0 flex-grow-1">
                    <div className="fw-semibold text-break">{p.codigo}</div>
                    <div className="small text-muted text-break">{p.descricao}</div>
                    {p.fabricante_parceiro_nome ? (
                      <div className="small text-secondary text-break">
                        {p.fabricante_parceiro_nome}
                      </div>
                    ) : null}
                  </div>
                  <div className="d-flex flex-wrap gap-2 flex-shrink-0">
                    <Link
                      to={catalogoPaths.produtoDetalhe(p.id)}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Ver dados fiscais
                    </Link>
                    {podeEditar ? (
                      <Link to={catalogoPaths.produtoEditar(p.id)} className="btn btn-sm btn-primary">
                        Editar produto
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {buscaDebounced.length === 0 && (
            <p className="text-muted small mt-3 mb-0">
              Comece a escrever para ver sugestões.
            </p>
          )}
        </div>
      </div>

      {grupos.map((grupo) => (
        <section key={grupo.titulo} className="mb-4">
          <h2 className="h6 text-uppercase text-muted fw-semibold mb-3">{grupo.titulo}</h2>
          <div className="row g-3">
            {grupo.itens.map((atalho) => (
              <AtalhoCard key={atalho.titulo} atalho={atalho} podeEditar={podeEditar} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
