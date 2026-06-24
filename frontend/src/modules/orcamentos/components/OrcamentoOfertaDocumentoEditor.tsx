import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from 'react'

import type { LinhaEditavelOrcamento } from '../types/orcamentoLinha'
import type { PropostaClienteEdicao } from '../types/propostaClienteEdicao'
import type {
  OrcamentoConfiguradorPainelDto,
  OrcamentoOfertaBlocoDto,
  PerfilOferta,
  TipoBlocoOferta,
} from '../types/orcamentos'
import { INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO } from '../utils/investimentoDescricao'
import { formatarNcmInvestimentoInput } from '../utils/ncmInvestimento'
import {
  agruparBlocosEditorOferta,
  secaoOfertaComConteudo,
  secoesTemplateParaPerfil,
  tituloPadraoTipoBloco,
} from '../utils/ofertaBlocoUi'
import {
  blocosParaDocumento,
  documentoParaBlocos,
  modeloDocumentoVazio,
} from '../utils/ofertaDocumento'
import { normalizarBlocosListaOferta } from '../utils/ofertaFormatacao'
import { montarPreviewOfertaLocal } from '../utils/montarPreviewOfertaLocal'
import {
  aplicarSequenciaOrdemBlocos,
  reordenarTiposNoGrupo,
  sequenciaTiposEditorVisual,
} from '../utils/reordenarBlocosOferta'
import { parseDecimalPt, valorMonetarioTabela } from '../utils/orcamentoUi'

import PropostaClienteDocument from './PropostaClienteDocument'
import OfertaSecaoCard from './OfertaSecaoCard'

import './OrcamentoOfertaDocumentoEditor.css'
import './PropostaClienteDocument.css'

export type ContextoOfertaEditor = Readonly<{
  codigo: string
  codigoBase?: string
  revisao?: string
  titulo: string
  validade: string | null
  clienteNome: string
  clienteContato: string
  clienteEmail: string
  clienteTelefone: string
  clienteEndereco: string
  clienteCnpj: string
}>

type Props = Readonly<{
  blocos: OrcamentoOfertaBlocoDto[]
  setBlocos: Dispatch<SetStateAction<OrcamentoOfertaBlocoDto[]>>
  perfil: PerfilOferta
  podeEditar: boolean
  linhasItens?: LinhaEditavelOrcamento[]
  configuradoresPainel?: OrcamentoConfiguradorPainelDto[]
  descontoComercialAtivo?: boolean
  descontoPercentual?: string
  ncmInvestimento?: string
  setNcmInvestimento?: Dispatch<SetStateAction<string>>
  investimentoDescricao?: string
  setInvestimentoDescricao?: Dispatch<SetStateAction<string>>
  titulo?: string
  setTitulo?: Dispatch<SetStateAction<string>>
  fonteBlocosVersao: number
  contexto: ContextoOfertaEditor
}>

type ModoEditor = 'visual' | 'markdown'

type GrupoOrdemSecao = 'corpo' | 'apos' | 'condicoes'

function subtotalLinha(linha: LinhaEditavelOrcamento): number {
  const qtd = parseDecimalPt(linha.quantidade || '0')
  const preco = parseDecimalPt(linha.preco_unitario || '0')
  if (!Number.isFinite(qtd) || !Number.isFinite(preco)) return 0
  return qtd * preco
}

type InvestimentoOfertaSectionProps = Readonly<{
  perfil: PerfilOferta
  podeEditar: boolean
  ncmInvestimento: string
  setNcmInvestimento?: (v: string) => void
  investimentoDescricao: string
  setInvestimentoDescricao?: (v: string) => void
  linhasItens: LinhaEditavelOrcamento[]
  totalInvestimento: number
}>

function InvestimentoOfertaSection({
  perfil,
  podeEditar,
  ncmInvestimento,
  setNcmInvestimento,
  investimentoDescricao,
  setInvestimentoDescricao,
  linhasItens,
  totalInvestimento,
}: InvestimentoOfertaSectionProps) {
  const ehSolucaoCompleta = perfil === 'SOLUCAO_COMPLETA'
  return (
    <section
      className="orcamento-oferta-secao-card orcamento-oferta-secao-card--investimento"
      id="orc-oferta-secao-investimento"
    >
      <h3 className="orcamento-oferta-secao-card__titulo">Investimento (itens do orçamento)</h3>
      <p className="orcamento-oferta-secao-card__dica">
        {ehSolucaoCompleta
          ? 'Após «Serviços considerados» na proposta. Valores na aba Itens; NCM e descrição abaixo.'
          : 'Valores definidos na aba Itens. Não faz parte do texto das seções acima.'}
      </p>
      {ehSolucaoCompleta && podeEditar ? (
        <div className="orcamento-oferta-secao-card__investimento-params">
          <div className="orcamento-doc__field">
            <label htmlFor="orc-ncm-investimento">NCM (investimento)</label>
            <input
              id="orc-ncm-investimento"
              type="text"
              inputMode="numeric"
              className="form-control form-control-sm"
              style={{ maxWidth: '9rem' }}
              value={ncmInvestimento}
              disabled={!podeEditar}
              onChange={(e) => setNcmInvestimento?.(formatarNcmInvestimentoInput(e.target.value))}
              placeholder="85371090"
              maxLength={8}
            />
          </div>
          <div className="orcamento-doc__field" style={{ flex: '1 1 16rem', minWidth: '14rem' }}>
            <label htmlFor="orc-inv-descricao">Descrição (investimento)</label>
            <input
              id="orc-inv-descricao"
              type="text"
              className="form-control form-control-sm"
              value={investimentoDescricao}
              disabled={!podeEditar}
              onChange={(e) => setInvestimentoDescricao?.(e.target.value)}
              placeholder={INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO}
              maxLength={255}
            />
          </div>
        </div>
      ) : null}
      {linhasItens.length === 0 ? (
        <p className="text-muted small mb-0">Nenhum item na proposta.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-2 orcamento-oferta-secao-card__tabela">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Descrição</th>
                <th className="text-end">Qtd</th>
                <th className="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {linhasItens.map((linha, index) => (
                <tr key={linha.id || `linha-${linha.ordem}`}>
                  <td>{index + 1}</td>
                  <td>{linha.descricao || '—'}</td>
                  <td className="text-end">{linha.quantidade}</td>
                  <td className="text-end fw-semibold">
                    R$ {valorMonetarioTabela(subtotalLinha(linha))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="orcamento-oferta-secao-card__total">
            Total: R$ {valorMonetarioTabela(totalInvestimento)}
          </div>
        </div>
      )}
    </section>
  )
}

type PreviewPaneProps = Readonly<{
  preview: ComponentProps<typeof PropostaClienteDocument>['preview']
  edicao: PropostaClienteEdicao | undefined
}>

function PreviewPane({ preview, edicao }: PreviewPaneProps) {
  return (
    <div className="orcamento-oferta-editor__preview">
      <p className="orcamento-oferta-editor__preview-label">
        Prévia ao cliente
        {edicao ? (
          <span className="orcamento-oferta-editor__preview-hint">
            — edite nos campos destacados
          </span>
        ) : null}
      </p>
      <div className="orcamento-oferta-editor__preview-scroll">
        <PropostaClienteDocument preview={preview} edicao={edicao} />
      </div>
    </div>
  )
}

type EditorMarkdownPaneProps = Readonly<{
  documento: string
  podeEditar: boolean
  onAplicarDocumento: (texto: string) => void
  onInserirModelo: () => void
  preview: ComponentProps<typeof PropostaClienteDocument>['preview']
  edicao: PropostaClienteEdicao | undefined
}>

function EditorMarkdownPane({
  documento,
  podeEditar,
  onAplicarDocumento,
  onInserirModelo,
  preview,
  edicao,
}: EditorMarkdownPaneProps) {
  return (
    <div className="orcamento-oferta-editor__split">
      <div className="orcamento-oferta-editor__markdown">
        <p className="small text-muted mb-2">
          Use <code>## Nome da seção</code> (ex.: <code>## Escopo de fornecimento</code>). Apague
          um bloco inteiro para retirá-lo da proposta. Títulos personalizados são agrupados em{' '}
          <strong>Observações</strong>.
          {podeEditar ? (
            <>
              {' '}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline"
                onClick={onInserirModelo}
              >
                Inserir todas as seções do perfil
              </button>
            </>
          ) : null}
        </p>
        <textarea
          id="orc-oferta-documento"
          className="orcamento-oferta-editor__markdown-area"
          value={documento}
          onChange={(e) => onAplicarDocumento(e.target.value)}
          disabled={!podeEditar}
          rows={24}
          aria-label="Documento da oferta em markdown"
          spellCheck
        />
      </div>
      <PreviewPane preview={preview} edicao={edicao} />
    </div>
  )
}

export default function OrcamentoOfertaDocumentoEditor({
  blocos,
  setBlocos,
  perfil,
  podeEditar,
  linhasItens = [],
  configuradoresPainel = [],
  descontoComercialAtivo = false,
  descontoPercentual = '0',
  ncmInvestimento = '',
  setNcmInvestimento,
  investimentoDescricao = '',
  setInvestimentoDescricao,
  titulo = '',
  setTitulo,
  fonteBlocosVersao,
  contexto,
}: Props) {
  const [modo, setModo] = useState<ModoEditor>('visual')
  const [documento, setDocumento] = useState(() => blocosParaDocumento(blocos))
  const [arrastandoTipo, setArrastandoTipo] = useState<TipoBlocoOferta | null>(null)
  const [alvoArrasteTipo, setAlvoArrasteTipo] = useState<TipoBlocoOferta | null>(null)

  useEffect(() => {
    setBlocos((atuais) => normalizarBlocosListaOferta(atuais))
  }, [fonteBlocosVersao, setBlocos])

  useEffect(() => {
    if (modo !== 'visual') return
    setDocumento(blocosParaDocumento(blocos))
  }, [fonteBlocosVersao, blocos, modo])

  const blocosAgrupados = useMemo(
    () => agruparBlocosEditorOferta(blocos, perfil),
    [blocos, perfil]
  )

  const atualizarConteudoBloco = useCallback(
    (tipo: OrcamentoOfertaBlocoDto['tipo'], conteudo: string) => {
      setBlocos((atuais) =>
        atuais.map((b) => (b.tipo === tipo ? { ...b, conteudo } : b))
      )
    },
    [setBlocos]
  )

  const edicaoPrevia = useMemo((): PropostaClienteEdicao | undefined => {
    if (!podeEditar || !setTitulo) {
      return undefined
    }
    return {
      podeEditar: true,
      perfil,
      titulo,
      onTituloChange: setTitulo,
      onBlocoConteudoChange: atualizarConteudoBloco,
    }
  }, [atualizarConteudoBloco, perfil, podeEditar, setTitulo, titulo])

  const previewLocal = useMemo(
    () =>
      montarPreviewOfertaLocal({
        codigo: contexto.codigo,
        codigo_base: contexto.codigoBase,
        revisao: contexto.revisao,
        titulo: contexto.titulo,
        perfil_oferta: perfil,
        validade: contexto.validade,
        cliente: {
          nome: contexto.clienteNome,
          contato: contexto.clienteContato,
          email: contexto.clienteEmail,
          telefone: contexto.clienteTelefone,
          endereco: contexto.clienteEndereco,
          cnpj: contexto.clienteCnpj,
        },
        blocos,
        linhasItens,
        configuradores_painel: configuradoresPainel,
        desconto_comercial_ativo: descontoComercialAtivo,
        desconto_percentual: descontoPercentual,
        ncm_investimento: ncmInvestimento,
        investimento_descricao: investimentoDescricao,
      }),
    [
      blocos,
      configuradoresPainel,
      contexto,
      descontoComercialAtivo,
      descontoPercentual,
      investimentoDescricao,
      linhasItens,
      ncmInvestimento,
      perfil,
    ]
  )

  const totalInvestimento = linhasItens.reduce((acc, linha) => acc + subtotalLinha(linha), 0)

  const aplicarDocumento = (texto: string) => {
    setDocumento(texto)
    setBlocos((atuais) => documentoParaBlocos(texto, atuais, perfil))
  }

  const inserirModelo = () => {
    if (!podeEditar) return
    const modelo = modeloDocumentoVazio(perfil)
    aplicarDocumento(modelo)
  }

  const abrirModoMarkdown = () => {
    setDocumento(blocosParaDocumento(blocos))
    setModo('markdown')
  }

  const limparSecao = (tipo: OrcamentoOfertaBlocoDto['tipo']) => {
    if (!podeEditar) return
    atualizarConteudoBloco(tipo, '')
  }

  const reordenarGrupo = (
    grupo: GrupoOrdemSecao,
    tipoArrastado: TipoBlocoOferta,
    tipoAlvo: TipoBlocoOferta
  ) => {
    if (!podeEditar || tipoArrastado === tipoAlvo) return
    const corpo = blocosAgrupados.corpo.map((b) => b.tipo)
    const apos = blocosAgrupados.aposInvestimento.map((b) => b.tipo)
    const cond = blocosAgrupados.condicoes.map((b) => b.tipo)
    const nextCorpo =
      grupo === 'corpo' ? reordenarTiposNoGrupo(corpo, tipoArrastado, tipoAlvo) : corpo
    const nextApos =
      grupo === 'apos' ? reordenarTiposNoGrupo(apos, tipoArrastado, tipoAlvo) : apos
    const nextCond =
      grupo === 'condicoes' ? reordenarTiposNoGrupo(cond, tipoArrastado, tipoAlvo) : cond
    const sequencia = sequenciaTiposEditorVisual(perfil, nextCorpo, nextApos, nextCond)
    setBlocos(aplicarSequenciaOrdemBlocos(blocos, perfil, sequencia))
  }

  const renderCardSecao = (
    bloco: OrcamentoOfertaBlocoDto,
    grupoOrdem?: GrupoOrdemSecao,
    totalNoGrupo = 1
  ) => (
    <OfertaSecaoCard
      key={bloco.tipo}
      bloco={bloco}
      podeEditar={podeEditar}
      grupoOrdem={grupoOrdem}
      totalNoGrupo={totalNoGrupo}
      arrastandoTipo={arrastandoTipo}
      alvoArrasteTipo={alvoArrasteTipo}
      onArrastarInicio={setArrastandoTipo}
      onArrastarFim={() => {
        setArrastandoTipo(null)
        setAlvoArrasteTipo(null)
      }}
      onArrastarAlvo={setAlvoArrasteTipo}
      onReordenar={reordenarGrupo}
      onAtualizarConteudo={atualizarConteudoBloco}
      onLimparSecao={limparSecao}
    />
  )

  const secoesDisponiveisParaIncluir = useMemo(
    () =>
      secoesTemplateParaPerfil(perfil).filter((tipo) => {
        const bloco = blocos.find((b) => b.tipo === tipo)
        return bloco && !secaoOfertaComConteudo(bloco)
      }),
    [blocos, perfil]
  )

  return (
    <div className="orcamento-oferta-editor">
      <div className="orcamento-oferta-editor__barra">
        <div className="btn-group btn-group-sm" role="group" aria-label="Modo de edição">
          <button
            type="button"
            className={`btn ${modo === 'visual' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setModo('visual')}
          >
            Edição visual
          </button>
          <button
            type="button"
            className={`btn ${modo === 'markdown' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={abrirModoMarkdown}
          >
            Texto avançado
          </button>
        </div>
        <p className="orcamento-oferta-editor__barra-texto small text-muted mb-0">
          {modo === 'visual'
            ? 'Arraste ⠿ para reordenar seções (exceto Apresentação e Investimento). A ordem vale na prévia/PDF. Vazio = fora da proposta.'
            : 'Edite com ## Título por seção; títulos do perfil atualizam os blocos. Seções sem ## somem da proposta. Prévia à direita.'}{' '}
          Salve a proposta para persistir.
          {podeEditar ? null : (
            <>
              {' '}
              <strong className="text-warning">Proposta bloqueada para edição.</strong>
            </>
          )}
        </p>
      </div>

      {modo === 'visual' ? (
        <div className="orcamento-oferta-editor__split">
          <div className="orcamento-oferta-editor__secoes">
            {secoesDisponiveisParaIncluir.length > 0 ? (
              <div className="orcamento-oferta-editor__incluir-secoes">
                <span className="small text-muted">Incluir seção na proposta:</span>
                <div className="orcamento-oferta-editor__incluir-secoes-btns">
                  {secoesDisponiveisParaIncluir.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={!podeEditar}
                      onClick={() => {
                        const el = document.getElementById(`orc-oferta-secao-${tipo}`)
                        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      }}
                    >
                      + {tituloPadraoTipoBloco(tipo)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="orcamento-oferta-editor__titulo">
              <label htmlFor="orc-det-titulo">Título / referência</label>
              <input
                id="orc-det-titulo"
                className="form-control form-control-sm"
                value={titulo}
                onChange={(e) => setTitulo?.(e.target.value)}
                maxLength={200}
                required
                disabled={!podeEditar}
                placeholder="Ex.: Painel QGBT — linha de envase (assunto na proposta ao cliente)"
              />
              <p className="orcamento-oferta-editor__titulo-hint small text-muted mb-0">
                Objeto da proposta (assunto). Logo abaixo, o texto de <strong>Apresentação</strong>.
              </p>
            </div>

            {blocosAgrupados.intro ? renderCardSecao(blocosAgrupados.intro) : null}
            {blocosAgrupados.corpo.map((bloco) =>
              renderCardSecao(bloco, 'corpo', blocosAgrupados.corpo.length)
            )}

            <InvestimentoOfertaSection
              perfil={perfil}
              podeEditar={podeEditar}
              ncmInvestimento={ncmInvestimento}
              setNcmInvestimento={setNcmInvestimento}
              investimentoDescricao={investimentoDescricao}
              setInvestimentoDescricao={setInvestimentoDescricao}
              linhasItens={linhasItens}
              totalInvestimento={totalInvestimento}
            />

            {blocosAgrupados.aposInvestimento.map((bloco) =>
              renderCardSecao(bloco, 'apos', blocosAgrupados.aposInvestimento.length)
            )}
            {blocosAgrupados.condicoes.map((bloco) =>
              renderCardSecao(bloco, 'condicoes', blocosAgrupados.condicoes.length)
            )}
          </div>

          <PreviewPane preview={previewLocal} edicao={edicaoPrevia} />
        </div>
      ) : (
        <EditorMarkdownPane
          documento={documento}
          podeEditar={podeEditar}
          onAplicarDocumento={aplicarDocumento}
          onInserirModelo={inserirModelo}
          preview={previewLocal}
          edicao={edicaoPrevia}
        />
      )}
    </div>
  )
}
