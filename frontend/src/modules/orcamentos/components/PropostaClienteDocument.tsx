import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { ZFW_LOGO_ENGENHARIA_URL } from '@/constants/brandingAssets'
import { formatCnpjExibicao } from '@/modules/fiscal/utils/fiscalDisplay'
import type { PropostaClienteEdicao } from '../types/propostaClienteEdicao'
import type { OrcamentoPreviewOfertaDto, TipoBlocoOferta } from '../types/orcamentos'
import OfertaConteudoFormatado from '../utils/ofertaConteudoFormatado'
import { parseDecimalPt } from '../utils/orcamentoUi'
import {
  formatarDataCurta,
  formatarNomeEmpresaExibicao,
  linhasDescricaoItem,
  nomeArquivoImpressaoPropostaCliente,
  numeroPropostaExibicao,
  rotuloRevisao,
  secaoIntroducao,
  secoesCondicoesComerciais,
  secoesAposInvestimento,
  secoesCorpoProposta,
  textoSaudacaoPadrao,
  tituloSecaoFigma,
} from '../utils/propostaClienteUi'

import ResumoFinanceiroOferta from './ResumoFinanceiroOferta'

import {
  ativarImpressaoPropostaClienteDom,
  desativarImpressaoPropostaClienteDom,
} from '../utils/impressaoPropostaClienteDom'

import './PropostaClienteDocument.css'

const EMPRESA = {
  razao: 'ZFW ENGENHARIA EM CONTROLE E SISTEMAS LTDA',
  cnpj: '07.284.171/0001-39',
  linha1: 'Rua República da China, 80',
  linha2: '89211-420 Joinville – SC – Brasil',
  fone: '+55 47 3473-7029',
  email: 'vendas@zfw.com.br',
  site: 'www.zfw.com.br',
}

function valorMonetario(valor: string): string {
  const n = parseDecimalPt(valor)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function exibirNcm(ncm: string | undefined): string {
  const digits = (ncm ?? '').replace(/\D/g, '')
  return digits || '—'
}

type Props = Readonly<{
  preview: OrcamentoPreviewOfertaDto
  toolbar?: ReactNode
  /** Página dedicada à impressão/PDF — alinha CSS com a prévia fiel. */
  paginaImpressao?: boolean
  /** Edição inline na prévia (somente no editor da oferta). */
  edicao?: PropostaClienteEdicao
}>

function estimarLinhasEditavel(texto: string, minimo = 3, maximo = 14): number {
  const linhas = (texto || '').split('\n').length
  return Math.min(maximo, Math.max(minimo, linhas + 1))
}

function ConteudoSecaoEditavel({
  conteudo,
  tipo,
  edicao,
}: Readonly<{
  conteudo: string
  tipo: TipoBlocoOferta
  edicao: PropostaClienteEdicao
}>) {
  if (!edicao.podeEditar) {
    return (
      <div className="proposta-cliente__texto-leitura">
        <OfertaConteudoFormatado conteudo={conteudo || '—'} />
      </div>
    )
  }
  return (
    <textarea
      className="proposta-cliente__campo-editavel proposta-cliente__campo-editavel--secao"
      value={conteudo}
      onChange={(e) => edicao.onBlocoConteudoChange(tipo, e.target.value)}
      rows={estimarLinhasEditavel(conteudo)}
      aria-label={`Editar ${tipo}`}
      spellCheck
    />
  )
}

function numeroProposta(preview: OrcamentoPreviewOfertaDto): string {
  return numeroPropostaExibicao(preview.codigo, preview.revisao, preview.codigo_base)
}

function CabecalhoInicio({ preview }: Readonly<{ preview: OrcamentoPreviewOfertaDto }>) {
  return (
    <header className="proposta-cliente__cabecalho-inicio">
      <div className="proposta-cliente__cabecalho-inicio-esq">
        <img
          src={ZFW_LOGO_ENGENHARIA_URL}
          alt="ZFW Engenharia"
          className="proposta-cliente__cabecalho-logo"
        />
        <address className="proposta-cliente__empresa-contato">
          <span>
            {EMPRESA.linha1} · {EMPRESA.linha2}
          </span>
          <span>
            {EMPRESA.fone} · {EMPRESA.email}
          </span>
          <span>
            {EMPRESA.site} · CNPJ {EMPRESA.cnpj}
          </span>
        </address>
      </div>
      <aside className="proposta-cliente__caixa-meta" aria-label="Dados da oferta">
        <p className="proposta-cliente__caixa-meta-titulo">Oferta comercial</p>
        <dl className="proposta-cliente__caixa-meta-grid">
          <div>
            <dt>Número</dt>
            <dd>{numeroProposta(preview)}</dd>
          </div>
          <div>
            <dt>Revisão</dt>
            <dd>{rotuloRevisao(preview.revisao)}</dd>
          </div>
          <div>
            <dt>Emissão</dt>
            <dd>{formatarDataCurta(preview.emissao ?? null)}</dd>
          </div>
          <div>
            <dt>Validade</dt>
            <dd>{formatarDataCurta(preview.validade)}</dd>
          </div>
        </dl>
      </aside>
    </header>
  )
}

function CabecalhoResumido({ preview }: Readonly<{ preview: OrcamentoPreviewOfertaDto }>) {
  return (
    <header className="proposta-cliente__cabecalho-resumido">
      <img
        src={ZFW_LOGO_ENGENHARIA_URL}
        alt="ZFW Engenharia"
        className="proposta-cliente__cabecalho-resumido-logo"
      />
      <div className="proposta-cliente__cabecalho-resumido-texto">
        <strong>{numeroProposta(preview)}</strong>
      </div>
    </header>
  )
}

function BlocoDestinatario({ preview }: Readonly<{ preview: OrcamentoPreviewOfertaDto }>) {
  const empresa = formatarNomeEmpresaExibicao(preview.cliente.nome)
  const contato = preview.cliente.contato?.trim() || '—'
  const telefone = preview.cliente.telefone?.trim() || '—'
  const email = preview.cliente.email?.trim() || '—'
  const endereco = preview.cliente.endereco?.trim() || '—'
  const cnpjRaw = preview.cliente.cnpj?.trim() ?? ''
  const cnpj = cnpjRaw ? formatCnpjExibicao(cnpjRaw) : '—'

  return (
    <section className="proposta-cliente__destinatario">
      <TituloSecaoVerde>Destinatário</TituloSecaoVerde>
      <div className="proposta-cliente__destinatario-card">
        <div className="proposta-cliente__destinatario-ident">
          <div className="proposta-cliente__campo proposta-cliente__campo--empresa">
            <span className="proposta-cliente__campo-rotulo">Empresa</span>
            <span className="proposta-cliente__campo-valor">{empresa}</span>
          </div>
          <div className="proposta-cliente__campo">
            <span className="proposta-cliente__campo-rotulo">CNPJ</span>
            <span className="proposta-cliente__campo-valor">{cnpj}</span>
          </div>
        </div>
        <div className="proposta-cliente__destinatario-contato">
          <div className="proposta-cliente__campo">
            <span className="proposta-cliente__campo-rotulo">Contato</span>
            <span className="proposta-cliente__campo-valor">{contato}</span>
          </div>
          <div className="proposta-cliente__campo">
            <span className="proposta-cliente__campo-rotulo">Telefone</span>
            <span className="proposta-cliente__campo-valor">{telefone}</span>
          </div>
          <div className="proposta-cliente__campo">
            <span className="proposta-cliente__campo-rotulo">E-mail</span>
            <span className="proposta-cliente__campo-valor">{email}</span>
          </div>
        </div>
        <div className="proposta-cliente__campo proposta-cliente__campo--wide">
          <span className="proposta-cliente__campo-rotulo">Endereço</span>
          <span className="proposta-cliente__campo-valor">{endereco}</span>
        </div>
      </div>
    </section>
  )
}

/** Título de seção no estilo Figma (verde, caps). */
function TituloSecaoVerde({ children }: Readonly<{ children: string }>) {
  return <h2 className="proposta-cliente__secao-titulo">{children}</h2>
}

function LinhaRodapeEmpresa({ preview }: Readonly<{ preview: OrcamentoPreviewOfertaDto }>) {
  return (
    <span className="proposta-cliente__folha-rodape-empresa">
      {EMPRESA.razao} · CNPJ {EMPRESA.cnpj} · {numeroProposta(preview)} ·{' '}
      {rotuloRevisao(preview.revisao)} · Emitido em {formatarDataCurta(preview.emissao ?? null)}
    </span>
  )
}

/** Rodapé fixo na impressão — repete em cada página física com contador CSS. */
function RodapeImpressao({ preview }: Readonly<{ preview: OrcamentoPreviewOfertaDto }>) {
  return (
    <footer className="proposta-cliente__rodape-impressao" aria-hidden="true">
      <LinhaRodapeEmpresa preview={preview} />
      <span className="proposta-cliente__folha-rodape-pagina proposta-cliente__folha-rodape-pagina--css" />
    </footer>
  )
}

/** Rodapé único na pré-visualização em tela (fim do documento). */
function RodapeTela({ preview }: Readonly<{ preview: OrcamentoPreviewOfertaDto }>) {
  return (
    <footer className="proposta-cliente__folha-rodape proposta-cliente__folha-rodape--tela">
      <LinhaRodapeEmpresa preview={preview} />
    </footer>
  )
}

export default function PropostaClienteDocument({
  preview,
  toolbar,
  paginaImpressao,
  edicao,
}: Props) {
  useEffect(() => {
    if (!paginaImpressao) return
    ativarImpressaoPropostaClienteDom()
    return () => desativarImpressaoPropostaClienteDom()
  }, [paginaImpressao])
  const intro = secaoIntroducao(preview.secoes)
  const secoesCorpo = secoesCorpoProposta(preview.secoes)
  const secoesPosInvestimento = secoesAposInvestimento(preview.secoes)
  const condicoes = secoesCondicoesComerciais(preview.secoes)
  const apendice = preview.apendice_legal?.secoes ?? []
  const temInvestimento = preview.investimento.itens.length > 0

  const saudacao =
    intro?.conteudo?.trim() || textoSaudacaoPadrao(preview.perfil_oferta)

  const textoIntroducaoEdicao =
    intro?.conteudo?.trim() || textoSaudacaoPadrao(preview.perfil_oferta)

  const tituloTabela = tituloSecaoFigma(preview.investimento.titulo || 'Investimento')
  const edicaoAtiva = Boolean(edicao?.podeEditar)
  const nomeArquivoImpressao = nomeArquivoImpressaoPropostaCliente(
    preview.codigo,
    preview.revisao,
    preview.codigo_base
  )

  return (
    <div
      className={`proposta-cliente${paginaImpressao ? ' proposta-cliente--pagina-impressao' : ''}`}
      data-nome-arquivo-impressao={nomeArquivoImpressao}
    >
      {toolbar ? <div className="proposta-cliente__toolbar">{toolbar}</div> : null}

      <article className="proposta-cliente__doc">
        <RodapeImpressao preview={preview} />

        <section className="proposta-cliente__folha proposta-cliente__folha--principal">
          <div className="proposta-cliente__folha-conteudo">
            <div className="proposta-cliente__cabecalho-principal">
              <CabecalhoInicio preview={preview} />
              <div className="proposta-cliente__separador-inicio" aria-hidden="true" />
              <BlocoDestinatario preview={preview} />
              <section className="proposta-cliente__bloco proposta-cliente__bloco--objeto">
                <TituloSecaoVerde>Objeto da proposta</TituloSecaoVerde>
                <div className="proposta-cliente__objeto-card">
                  <span className="proposta-cliente__campo-rotulo">Assunto</span>
                  {edicaoAtiva && edicao ? (
                    <input
                      type="text"
                      className="proposta-cliente__campo-editavel proposta-cliente__objeto-assunto"
                      value={edicao.titulo}
                      onChange={(e) => edicao.onTituloChange(e.target.value)}
                      maxLength={200}
                      aria-label="Assunto da proposta"
                    />
                  ) : (
                    <p className="proposta-cliente__objeto-assunto">{preview.titulo}</p>
                  )}
                </div>
              </section>
              <section className="proposta-cliente__bloco">
                <TituloSecaoVerde>Apresentação</TituloSecaoVerde>
                {edicaoAtiva && edicao ? (
                  <textarea
                    className="proposta-cliente__campo-editavel proposta-cliente__campo-editavel--secao"
                    value={textoIntroducaoEdicao}
                    onChange={(e) => edicao.onBlocoConteudoChange('INTRODUCAO', e.target.value)}
                    rows={estimarLinhasEditavel(textoIntroducaoEdicao, 4, 10)}
                    aria-label="Apresentação"
                    spellCheck
                  />
                ) : (
                  <p className="proposta-cliente__texto-leitura">{saudacao}</p>
                )}
              </section>
            </div>

            {secoesCorpo.map((secao) => (
              <section key={`${secao.tipo}-${secao.titulo}`} className="proposta-cliente__bloco">
                <TituloSecaoVerde>{tituloSecaoFigma(secao.titulo)}</TituloSecaoVerde>
                {edicao ? (
                  <ConteudoSecaoEditavel
                    conteudo={secao.conteudo || ''}
                    tipo={secao.tipo}
                    edicao={edicao}
                  />
                ) : (
                  <div className="proposta-cliente__texto-leitura">
                    <OfertaConteudoFormatado conteudo={secao.conteudo || '—'} />
                  </div>
                )}
              </section>
            ))}

            {temInvestimento ? (
              <section className="proposta-cliente__bloco proposta-cliente__bloco--tabela">
              <TituloSecaoVerde>{tituloTabela}</TituloSecaoVerde>
              <div className="proposta-cliente__tabela-wrap">
                <table className="proposta-cliente__tabela">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th className="proposta-cliente__tabela-ncm">NCM</th>
                      <th className="proposta-cliente__tabela-num">Qtd.</th>
                      <th className="proposta-cliente__tabela-un">Un.</th>
                      <th className="proposta-cliente__tabela-num">Valor unit.</th>
                      <th className="proposta-cliente__tabela-num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.investimento.itens.map((item, index) => {
                      const { titulo, detalhe } = linhasDescricaoItem(item.descricao)
                      return (
                        <tr key={item.id ?? `${item.descricao}-${index}`}>
                          <td>
                            <span className="proposta-cliente__item-titulo">{titulo}</span>
                            {detalhe ? (
                              <span className="proposta-cliente__item-detalhe">{detalhe}</span>
                            ) : null}
                            {item.codigo ? (
                              <span className="proposta-cliente__item-codigo">{item.codigo}</span>
                            ) : null}
                          </td>
                          <td className="proposta-cliente__tabela-ncm">{exibirNcm(item.ncm)}</td>
                          <td className="proposta-cliente__tabela-num">{item.quantidade}</td>
                          <td className="proposta-cliente__tabela-un">
                            {item.unidade?.trim() || 'un'}
                          </td>
                          <td className="proposta-cliente__tabela-num">
                            R$ {valorMonetario(item.preco_unitario)}
                          </td>
                          <td className="proposta-cliente__tabela-num proposta-cliente__tabela-total">
                            R$ {valorMonetario(item.subtotal)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ResumoFinanceiroOferta
                totais={preview.totais}
                className="proposta-cliente__resumo-valores"
              />
              </section>
            ) : null}

            {secoesPosInvestimento.map((secao) => (
              <section key={`${secao.tipo}-${secao.titulo}`} className="proposta-cliente__bloco">
                <TituloSecaoVerde>{tituloSecaoFigma(secao.titulo)}</TituloSecaoVerde>
                {edicao ? (
                  <ConteudoSecaoEditavel
                    conteudo={secao.conteudo || ''}
                    tipo={secao.tipo}
                    edicao={edicao}
                  />
                ) : (
                  <div className="proposta-cliente__texto-leitura">
                    <OfertaConteudoFormatado conteudo={secao.conteudo || '—'} />
                  </div>
                )}
              </section>
            ))}

            {condicoes.length > 0 ? (
              <section className="proposta-cliente__bloco proposta-cliente__bloco--condicoes">
                <TituloSecaoVerde>Condições comerciais</TituloSecaoVerde>
                <div className="proposta-cliente__condicoes-lista">
                  {condicoes.map((secao) => (
                    <div key={`${secao.tipo}-${secao.titulo}`} className="proposta-cliente__condicao-card">
                      <h3>{tituloSecaoFigma(secao.titulo)}</h3>
                      {edicao ? (
                        <ConteudoSecaoEditavel
                          conteudo={secao.conteudo || ''}
                          tipo={secao.tipo}
                          edicao={edicao}
                        />
                      ) : (
                        <OfertaConteudoFormatado conteudo={secao.conteudo} />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>

        <section className="proposta-cliente__folha proposta-cliente__folha--aceite">
          <div className="proposta-cliente__folha-conteudo">
          <CabecalhoResumido preview={preview} />
          <section className="proposta-cliente__bloco proposta-cliente__bloco--aceite">
            <TituloSecaoVerde>Aceite e assinatura</TituloSecaoVerde>
            <div className="proposta-cliente__painel-corpo">
              <p className="proposta-cliente__texto-leitura proposta-cliente__texto-aceite">
                Ao assinar abaixo, o Cliente declara ter lido e aceito integralmente os termos desta
                proposta ({numeroProposta(preview)}), autorizando a ZFW Engenharia a dar início aos serviços
                descritos.
              </p>
              <div className="proposta-cliente__assinaturas-duplas">
                <div className="proposta-cliente__assinatura-col">
                  <div className="proposta-cliente__assinatura-linha" />
                  <span className="proposta-cliente__assinatura-nome">Responsável comercial</span>
                  <span className="proposta-cliente__assinatura-empresa">ZFW Engenharia</span>
                </div>
                <div className="proposta-cliente__assinatura-col">
                  <div className="proposta-cliente__assinatura-linha" />
                  <span className="proposta-cliente__assinatura-nome">
                    {preview.cliente.contato || 'Representante do cliente'}
                  </span>
                  <span className="proposta-cliente__assinatura-empresa">
                    {formatarNomeEmpresaExibicao(preview.cliente.nome) || 'Cliente'}
                  </span>
                </div>
              </div>
              <p className="proposta-cliente__data-assinatura">Data: ___ / ___ / ______</p>
            </div>
          </section>
          </div>
        </section>

        {apendice.length > 0 ? (
          <section className="proposta-cliente__folha proposta-cliente__folha--legal">
            <div className="proposta-cliente__folha-conteudo">
            <CabecalhoResumido preview={preview} />
            <section className="proposta-cliente__bloco">
              <TituloSecaoVerde>Termos e condições gerais</TituloSecaoVerde>
              <p className="proposta-cliente__legal-versao">
                Apêndice · versão {preview.apendice_legal?.versao ?? '—'}
              </p>
              {apendice.map((bloco, index) => (
                <div key={bloco.id} className="proposta-cliente__legal-item">
                  <h3>
                    <span className="proposta-cliente__legal-num">{index + 1}.</span>
                    {bloco.titulo}
                  </h3>
                  <p>{bloco.conteudo}</p>
                </div>
              ))}
            </section>
            </div>
          </section>
        ) : null}

        <RodapeTela preview={preview} />
      </article>
    </div>
  )
}
