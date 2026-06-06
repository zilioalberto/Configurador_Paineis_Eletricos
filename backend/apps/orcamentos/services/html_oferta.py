"""HTML da proposta ao cliente, alinhado ao componente React de impressão."""
from __future__ import annotations

import base64
import re
from html import escape
from pathlib import Path

from django.conf import settings


EMPRESA = {
    "razao": "ZFW ENGENHARIA EM CONTROLE E SISTEMAS LTDA",
    "cnpj": "07.284.171/0001-39",
    "linha1": "Rua República da China, 80",
    "linha2": "89211-420 Joinville - SC - Brasil",
    "fone": "+55 47 3473-7029",
    "email": "vendas@zfw.com.br",
    "site": "www.zfw.com.br",
}

TIPOS_CONDICOES_COMERCIAIS = {
    "PRAZO_ENTREGA",
    "CONDICOES_PAGAMENTO",
    "CONDICOES_GERAIS",
    "GARANTIA",
    "OBSERVACOES",
}
TIPOS_APOS_INVESTIMENTO = {"EXCLUSOES"}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def logo_oferta_path() -> Path | None:
    raw_config = getattr(settings, "ZFW_EMAIL_LOGO_PATH", "")
    candidates: list[Path] = [
        Path(__file__).resolve().parent.parent / "assets" / "branding" / "zfw-logo-engenharia.png",
    ]
    if raw_config:
        configured = Path(raw_config)
        candidates.append(configured)
        if not configured.is_absolute():
            candidates.extend([_repo_root() / configured, Path(settings.BASE_DIR) / configured])
    candidates.extend(
        [
            _repo_root() / "frontend" / "public" / "branding" / "zfw-logo-engenharia.png",
            Path(settings.BASE_DIR).parent / "frontend" / "public" / "branding" / "zfw-logo-engenharia.png",
        ]
    )
    for path in candidates:
        if path.exists() and path.is_file():
            return path
    return None


def _asset_data_uri(path: Path | None) -> str:
    if not path:
        return ""
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def _safe(value) -> str:
    return escape("" if value is None else str(value), quote=True)


def _nl2br(value) -> str:
    return _safe(value).replace("\n", "<br>")


def _fmt_data_curta(iso: str | None) -> str:
    if not iso:
        return "-"
    try:
        ano, mes, dia = [int(p) for p in iso[:10].split("-")]
    except (TypeError, ValueError):
        return str(iso)
    meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    if mes < 1 or mes > 12:
        return str(iso)
    return f"{dia:02d} {meses[mes - 1]} {ano}"


def _fmt_brl(valor: str) -> str:
    try:
        n = float(str(valor).replace(",", "."))
        return f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return "-"


def _rotulo_revisao(revisao: str | None) -> str:
    valor = (revisao or "").strip()
    if not valor:
        return "Rev. A"
    return valor if valor.lower().startswith("rev") else f"Rev. {valor}"


def _numero_proposta(preview: dict) -> str:
    codigo_base = (preview.get("codigo_base") or "").strip()
    if codigo_base:
        return codigo_base
    codigo = (preview.get("codigo") or "").strip()
    if not codigo:
        return "-"
    match = re.match(r"^(.+?)\s+Rev\s+\S+$", codigo, flags=re.I)
    return match.group(1).strip() if match else codigo


def _texto_saudacao_padrao(perfil: str | None) -> str:
    if perfil == "SOLUCAO_COMPLETA":
        return (
            "Apresentamos esta proposta técnica-comercial em atendimento à solicitação de "
            "V.Sas., contemplando os serviços e entregáveis descritos neste documento."
        )
    return (
        "Apresentamos esta proposta técnica-comercial em atendimento à sua consulta, "
        "para o fornecimento dos itens e condições descritos abaixo."
    )


def _titulo_secao(titulo: str) -> str:
    return (titulo or "").strip().upper()


def _linhas_descricao(descricao: str) -> tuple[str, str]:
    texto = (descricao or "").strip()
    if not texto:
        return "-", ""
    if "\n" not in texto:
        return texto, ""
    titulo, detalhe = texto.split("\n", 1)
    return titulo.strip() or "-", detalhe.strip()


def _conteudo_formatado(conteudo: str) -> str:
    linhas = [linha.rstrip() for linha in (conteudo or "").splitlines()]
    html: list[str] = []
    lista: list[str] = []

    def flush_lista() -> None:
        nonlocal lista
        if lista:
            itens = "".join(f"<li>{_safe(item)}</li>" for item in lista)
            html.append(f'<ul class="oferta-conteudo-formatado__lista">{itens}</ul>')
            lista = []

    paragrafo: list[str] = []
    for linha in linhas:
        item = re.match(r"^\s*[-•]\s+(.*)$", linha)
        if item:
            if paragrafo:
                html.append(
                    f'<p class="oferta-conteudo-formatado__paragrafo">{"<br>".join(_safe(p) for p in paragrafo)}</p>'
                )
                paragrafo = []
            lista.append(item.group(1))
            continue
        if not linha.strip():
            flush_lista()
            if paragrafo:
                html.append(
                    f'<p class="oferta-conteudo-formatado__paragrafo">{"<br>".join(_safe(p) for p in paragrafo)}</p>'
                )
                paragrafo = []
            continue
        flush_lista()
        paragrafo.append(linha)

    flush_lista()
    if paragrafo:
        html.append(
            f'<p class="oferta-conteudo-formatado__paragrafo">{"<br>".join(_safe(p) for p in paragrafo)}</p>'
        )
    return "".join(html) or '<p class="oferta-conteudo-formatado__paragrafo">-</p>'


def _secao_introducao(secoes: list[dict]) -> dict | None:
    return next((s for s in secoes if s.get("tipo") == "INTRODUCAO" and (s.get("conteudo") or "").strip()), None)


def _secoes_corpo(secoes: list[dict]) -> list[dict]:
    return [
        s
        for s in secoes
        if not (s.get("tipo") == "INTRODUCAO" and (s.get("conteudo") or "").strip())
        and s.get("tipo") not in TIPOS_CONDICOES_COMERCIAIS
        and s.get("tipo") not in TIPOS_APOS_INVESTIMENTO
        and (s.get("titulo") or s.get("conteudo") or "").strip()
    ]


def _secoes_pos_investimento(secoes: list[dict]) -> list[dict]:
    return [
        s
        for s in secoes
        if s.get("tipo") in TIPOS_APOS_INVESTIMENTO and (s.get("titulo") or s.get("conteudo") or "").strip()
    ]


def _secoes_condicoes(secoes: list[dict]) -> list[dict]:
    return [
        s
        for s in secoes
        if s.get("tipo") in TIPOS_CONDICOES_COMERCIAIS and (s.get("conteudo") or "").strip()
    ]


def _secao_textual(secao: dict) -> str:
    return (
        '<section class="proposta-cliente__bloco">'
        f'<h2 class="proposta-cliente__secao-titulo">{_safe(_titulo_secao(secao.get("titulo") or ""))}</h2>'
        f'<div class="proposta-cliente__texto-leitura">{_conteudo_formatado(secao.get("conteudo") or "-")}</div>'
        "</section>"
    )


def _css() -> str:
    return """
@page { size: A4; margin: 11mm 13mm 18mm; }
html, body { margin: 0; padding: 0; background: #f8fafb; }
body { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #2d3a4a; font-size: 0.875rem; line-height: 1.5; }
.proposta-cliente { --doc-azul:#3d6d8c; --doc-azul-escuro:#2a4a62; --doc-verde:#4a8f6e; --doc-verde-suave:#edf5f0; --doc-azul-suave:#f3f7fa; --doc-fundo:#f8fafb; --doc-cartao:#fff; --doc-borda:#c5d0db; --doc-borda-suave:#dce4eb; --doc-texto:#2d3a4a; --doc-texto-suave:#5c6d7e; --doc-raio:8px; }
.proposta-cliente__doc { max-width: 52rem; margin: 0 auto; }
.proposta-cliente__folha { display: block; padding: 1rem 1.35rem 0.85rem; background: #fff; border: 1px solid #dce4eb; border-radius: 8px; page-break-inside: auto; break-inside: auto; }
.proposta-cliente__folha + .proposta-cliente__folha { margin-top: .75rem; }
.proposta-cliente__cabecalho-principal { margin-bottom: .5rem; }
.proposta-cliente__cabecalho-inicio { display: grid; grid-template-columns: minmax(0, 1fr) minmax(12.5rem, 17.5rem); align-items: start; gap: 1.5rem 2rem; }
.proposta-cliente__cabecalho-inicio-esq { display: flex; flex-direction: column; gap: .85rem; min-width: 0; }
.proposta-cliente__cabecalho-logo { display: block; width: 15rem; max-width: 100%; height: auto; max-height: 4rem; object-fit: contain; object-position: left center; }
.proposta-cliente__empresa-contato { display:flex; flex-direction:column; gap:.12rem; font-style:normal; }
.proposta-cliente__empresa-contato span { display:block; font-size:.7rem; line-height:1.4; color:#5c6d7e; }
.proposta-cliente__caixa-meta { padding:.75rem .9rem .85rem; border:1px solid #c5d0db; border-radius:8px; background:#fff; }
.proposta-cliente__caixa-meta-titulo { margin:0 0 .55rem; font-size:.6rem; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:#2a4a62; }
.proposta-cliente__caixa-meta-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:.55rem 1rem; margin:0; }
.proposta-cliente__caixa-meta-grid dt { margin:0; font-size:.58rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#5c6d7e; }
.proposta-cliente__caixa-meta-grid dd { margin:.12rem 0 0; font-size:.88rem; font-weight:600; color:#2a4a62; }
.proposta-cliente__separador-inicio { height:1px; margin:1rem 0 .95rem; background:#c5d0db; }
.proposta-cliente__destinatario { margin-bottom:1.15rem; }
.proposta-cliente__destinatario-card { display:flex; flex-direction:column; gap:1rem; padding:1rem 1.1rem; border:1px solid #dce4eb; border-radius:8px; background:#fff; }
.proposta-cliente__destinatario-ident { display:grid; grid-template-columns:minmax(0, 1fr) minmax(10.5rem, 13.5rem); gap:.85rem 1.25rem; align-items:start; }
.proposta-cliente__destinatario-contato { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:.85rem 1.25rem; }
.proposta-cliente__secao-titulo { margin:0 0 .85rem; font-size:.68rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#4a8f6e; }
.proposta-cliente__bloco { margin-bottom:1.2rem; }
.proposta-cliente__texto-leitura { margin:0; color:#445566; line-height:1.65; }
.oferta-conteudo-formatado__paragrafo { margin:0 0 .65rem; text-align:left; color:#445566; }
.oferta-conteudo-formatado__lista { margin:.25rem 0 .35rem; padding-left:1.2rem; }
.oferta-conteudo-formatado__lista li + li { margin-top:.4rem; }
.proposta-cliente__objeto-card, .proposta-cliente__condicao-card, .proposta-cliente__legal-item, .proposta-cliente__painel-corpo { border-radius:8px; }
.proposta-cliente__objeto-card { padding:.9rem 1rem; border:1px solid #d8e6ef; background:#f3f7fa; }
.proposta-cliente__campo-rotulo { display:block; font-size:.6rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#5c6d7e; margin-bottom:.2rem; }
.proposta-cliente__campo-valor { display:block; font-size:.88rem; font-weight:500; color:#2d3a4a; }
.proposta-cliente__campo--empresa .proposta-cliente__campo-valor, .proposta-cliente__objeto-assunto { font-size:.95rem; font-weight:600; color:#2a4a62; line-height:1.45; }
.proposta-cliente__objeto-assunto { margin:.2rem 0 0; font-size:1rem; }
.proposta-cliente__tabela-wrap { overflow:hidden; border:1px solid #c5d0db; border-radius:8px; background:#fff; }
.proposta-cliente__tabela { width:100%; border-collapse:collapse; font-size:.8rem; }
.proposta-cliente__tabela th, .proposta-cliente__tabela td { padding:.45rem .55rem; border:1px solid #c5d0db; vertical-align:top; }
.proposta-cliente__tabela thead { display: table-header-group; }
.proposta-cliente__tabela thead th { font-size:.58rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#2d3a4a; background:#f4f6f8; text-align:left; }
.proposta-cliente__tabela-num { text-align:right; white-space:nowrap; }
.proposta-cliente__tabela-ncm { width:4.5rem; text-align:center; font-size:.74rem; color:#5c6d7e; white-space:nowrap; }
.proposta-cliente__tabela-un { text-align:center; color:#5c6d7e; font-size:.76rem; width:2.6rem; }
.proposta-cliente__tabela-total { font-weight:600; color:#2a4a62; }
.proposta-cliente__item-titulo { display:block; font-weight:600; font-size:.8rem; color:#2d3a4a; line-height:1.35; }
.proposta-cliente__item-detalhe, .proposta-cliente__item-codigo { display:block; margin-top:.2rem; font-size:.74rem; color:#5c6d7e; line-height:1.45; }
.proposta-cliente__item-codigo { font-size:.68rem; }
.proposta-cliente__resumo-valores { margin-top:.65rem; margin-left:auto; width:17.5rem; display:grid; gap:.15rem; }
.resumo-financeiro-oferta__linha { display:flex; justify-content:space-between; gap:1rem; padding:.2rem 0; font-size:.8rem; }
.resumo-financeiro-oferta__linha span, .resumo-financeiro-oferta__linha strong { color:#2d3a4a; font-weight:600; }
.resumo-financeiro-oferta__linha--detalhe span, .resumo-financeiro-oferta__linha--detalhe strong { font-size:.74rem; font-weight:400; color:#5c6d7e; }
.resumo-financeiro-oferta__linha--total { margin-top:.25rem; padding-top:.35rem; border-top:1px solid #c5d0db; }
.resumo-financeiro-oferta__linha--total span { font-weight:700; text-transform:uppercase; font-size:.72rem; letter-spacing:.06em; }
.resumo-financeiro-oferta__linha--total strong { font-size:.95rem; font-weight:700; color:#2a4a62; }
.proposta-cliente__condicoes-lista { display:grid; gap:1.15rem; }
.proposta-cliente__condicao-card { padding:.75rem .9rem; border:1px solid #dce4eb; background:#fff; }
.proposta-cliente__condicao-card h3 { margin:0 0 .35rem; font-size:.62rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#5c6d7e; }
.proposta-cliente__cabecalho-resumido { display:flex; align-items:center; gap:.55rem; margin-bottom:.75rem; padding-bottom:.5rem; border-bottom:1px solid #dce4eb; }
.proposta-cliente__cabecalho-resumido-logo { display:block; width:auto; height:2rem; max-width:8rem; object-fit:contain; }
.proposta-cliente__cabecalho-resumido-texto { font-size:.78rem; color:#5c6d7e; }
.proposta-cliente__cabecalho-resumido-texto strong { color:#2a4a62; font-weight:600; }
.proposta-cliente__painel-corpo { padding:1rem 1.1rem; border:1px solid #dce4eb; background:#fff; }
.proposta-cliente__texto-aceite { margin-bottom:1.25rem; }
.proposta-cliente__assinaturas-duplas { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:2.5rem; margin-top:1.75rem; }
.proposta-cliente__assinatura-linha { height:3.25rem; border-bottom:1px solid #b8c5d0; margin-bottom:.5rem; }
.proposta-cliente__assinatura-nome { display:block; font-weight:600; font-size:.86rem; color:#2d3a4a; }
.proposta-cliente__assinatura-empresa, .proposta-cliente__data-assinatura { display:block; font-size:.78rem; color:#5c6d7e; margin-top:.15rem; }
.proposta-cliente__data-assinatura { margin:1.75rem 0 0; font-size:.82rem; }
.proposta-cliente__legal-versao { margin:0 0 .9rem; font-size:.75rem; color:#5c6d7e; }
.proposta-cliente__legal-item { padding:.75rem .9rem; background:#fff; border:1px solid #dce4eb; }
.proposta-cliente__legal-item + .proposta-cliente__legal-item { margin-top:.55rem; }
.proposta-cliente__legal-item h3 { margin:0 0 .25rem; font-size:.8rem; font-weight:600; color:#2a4a62; }
.proposta-cliente__legal-num { color:#4a8f6e; margin-right:.25rem; font-weight:700; }
.proposta-cliente__legal-item p { margin:0; font-size:.8rem; color:#5c6d7e; line-height:1.5; }
.proposta-cliente__folha--aceite, .proposta-cliente__folha--legal { page-break-before: always; break-before: page; }
.proposta-cliente__folha-rodape { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; font-size:.62rem; color:#5c6d7e; margin-top:1rem; padding:.5rem 0 0; border-top:1px solid #c5d0db; page-break-inside: avoid; break-inside: avoid; }
"""


def gerar_html_oferta(preview: dict) -> str:
    logo_uri = _asset_data_uri(logo_oferta_path())
    logo = f'<img src="{logo_uri}" alt="ZFW Engenharia" class="proposta-cliente__cabecalho-logo">' if logo_uri else "<strong>ZFW Engenharia</strong>"
    logo_resumido = f'<img src="{logo_uri}" alt="ZFW Engenharia" class="proposta-cliente__cabecalho-resumido-logo">' if logo_uri else "<strong>ZFW</strong>"
    cliente = preview.get("cliente") or {}
    secoes = preview.get("secoes") or []
    intro = _secao_introducao(secoes)
    saudacao = (intro or {}).get("conteudo") or _texto_saudacao_padrao(preview.get("perfil_oferta"))
    numero = _numero_proposta(preview)

    itens_html = ""
    for index, item in enumerate((preview.get("investimento") or {}).get("itens") or []):
        titulo, detalhe = _linhas_descricao(item.get("descricao") or "")
        detalhe_html = f'<span class="proposta-cliente__item-detalhe">{_nl2br(detalhe)}</span>' if detalhe else ""
        codigo_html = f'<span class="proposta-cliente__item-codigo">{_safe(item.get("codigo"))}</span>' if item.get("codigo") else ""
        itens_html += f"""
          <tr>
            <td><span class="proposta-cliente__item-titulo">{_safe(titulo)}</span>{detalhe_html}{codigo_html}</td>
            <td class="proposta-cliente__tabela-ncm">{_safe(re.sub(r'\\D', '', item.get('ncm') or '') or '-')}</td>
            <td class="proposta-cliente__tabela-num">{_safe(item.get('quantidade') or '1')}</td>
            <td class="proposta-cliente__tabela-un">{_safe((item.get('unidade') or 'un').strip() or 'un')}</td>
            <td class="proposta-cliente__tabela-num">R$ {_fmt_brl(item.get('preco_unitario') or '0')}</td>
            <td class="proposta-cliente__tabela-num proposta-cliente__tabela-total">R$ {_fmt_brl(item.get('subtotal') or '0')}</td>
          </tr>
        """

    totais = preview.get("totais") or {}
    resumo_html = ""
    if totais.get("desconto_ativo"):
        resumo_html += f'<div class="resumo-financeiro-oferta__linha"><span>Subtotal</span><strong>R$ {_fmt_brl(totais.get("subtotal"))}</strong></div>'
        resumo_html += f'<div class="resumo-financeiro-oferta__linha resumo-financeiro-oferta__linha--detalhe"><span>Desconto</span><strong>- R$ {_fmt_brl(totais.get("desconto_valor"))}</strong></div>'
    resumo_html += f'<div class="resumo-financeiro-oferta__linha resumo-financeiro-oferta__linha--total"><span>Total geral</span><strong>R$ {_fmt_brl(totais.get("total"))}</strong></div>'

    investimento_html = ""
    if itens_html:
        titulo_tabela = _titulo_secao((preview.get("investimento") or {}).get("titulo") or "Investimento")
        investimento_html = f"""
          <section class="proposta-cliente__bloco proposta-cliente__bloco--tabela">
            <h2 class="proposta-cliente__secao-titulo">{_safe(titulo_tabela)}</h2>
            <div class="proposta-cliente__tabela-wrap">
              <table class="proposta-cliente__tabela">
                <thead>
                  <tr>
                    <th>Descrição</th><th class="proposta-cliente__tabela-ncm">NCM</th>
                    <th class="proposta-cliente__tabela-num">Qtd.</th><th class="proposta-cliente__tabela-un">Un.</th>
                    <th class="proposta-cliente__tabela-num">Valor unit.</th><th class="proposta-cliente__tabela-num">Total</th>
                  </tr>
                </thead>
                <tbody>{itens_html}</tbody>
              </table>
            </div>
            <div class="resumo-financeiro-oferta proposta-cliente__resumo-valores">{resumo_html}</div>
          </section>
        """

    condicoes_html = ""
    condicoes = _secoes_condicoes(secoes)
    if condicoes:
        cards = "".join(
            f'<div class="proposta-cliente__condicao-card"><h3>{_safe(_titulo_secao(s.get("titulo") or ""))}</h3>{_conteudo_formatado(s.get("conteudo") or "-")}</div>'
            for s in condicoes
        )
        condicoes_html = f'<section class="proposta-cliente__bloco proposta-cliente__bloco--condicoes"><h2 class="proposta-cliente__secao-titulo">Condições comerciais</h2><div class="proposta-cliente__condicoes-lista">{cards}</div></section>'

    apendice = (preview.get("apendice_legal") or {}).get("secoes") or []
    apendice_html = ""
    if apendice:
        itens = "".join(
            f'<div class="proposta-cliente__legal-item"><h3><span class="proposta-cliente__legal-num">{i}.</span>{_safe(b.get("titulo") or "")}</h3><p>{_safe(b.get("conteudo") or "-")}</p></div>'
            for i, b in enumerate(apendice, start=1)
        )
        apendice_html = f"""
          <section class="proposta-cliente__folha proposta-cliente__folha--legal">
            <div class="proposta-cliente__cabecalho-resumido">{logo_resumido}<div class="proposta-cliente__cabecalho-resumido-texto"><strong>{_safe(numero)}</strong></div></div>
            <section class="proposta-cliente__bloco">
              <h2 class="proposta-cliente__secao-titulo">Termos e condições gerais</h2>
              <p class="proposta-cliente__legal-versao">Apêndice · versão {_safe((preview.get("apendice_legal") or {}).get("versao") or "-")}</p>
              {itens}
            </section>
          </section>
        """

    return f"""<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><style>{_css()}</style></head>
<body class="proposta-cliente-impressao-ativa">
  <div class="proposta-cliente proposta-cliente--pagina-impressao">
    <article class="proposta-cliente__doc">
      <section class="proposta-cliente__folha proposta-cliente__folha--principal">
        <div class="proposta-cliente__cabecalho-principal">
          <header class="proposta-cliente__cabecalho-inicio">
            <div class="proposta-cliente__cabecalho-inicio-esq">
              {logo}
              <address class="proposta-cliente__empresa-contato">
                <span>{EMPRESA["linha1"]} · {EMPRESA["linha2"]}</span>
                <span>{EMPRESA["fone"]} · {EMPRESA["email"]}</span>
                <span>{EMPRESA["site"]} · CNPJ {EMPRESA["cnpj"]}</span>
              </address>
            </div>
            <aside class="proposta-cliente__caixa-meta">
              <p class="proposta-cliente__caixa-meta-titulo">Oferta comercial</p>
              <dl class="proposta-cliente__caixa-meta-grid">
                <div><dt>Número</dt><dd>{_safe(numero)}</dd></div>
                <div><dt>Revisão</dt><dd>{_safe(_rotulo_revisao(preview.get("revisao")))}</dd></div>
                <div><dt>Emissão</dt><dd>{_safe(_fmt_data_curta(preview.get("emissao")))}</dd></div>
                <div><dt>Validade</dt><dd>{_safe(_fmt_data_curta(preview.get("validade")))}</dd></div>
              </dl>
            </aside>
          </header>
          <div class="proposta-cliente__separador-inicio"></div>
          <section class="proposta-cliente__destinatario">
            <h2 class="proposta-cliente__secao-titulo">Destinatário</h2>
            <div class="proposta-cliente__destinatario-card">
              <div class="proposta-cliente__destinatario-ident">
                <div class="proposta-cliente__campo proposta-cliente__campo--empresa"><span class="proposta-cliente__campo-rotulo">Empresa</span><span class="proposta-cliente__campo-valor">{_safe(cliente.get("nome") or "-")}</span></div>
                <div class="proposta-cliente__campo"><span class="proposta-cliente__campo-rotulo">CNPJ</span><span class="proposta-cliente__campo-valor">{_safe(cliente.get("cnpj") or "-")}</span></div>
              </div>
              <div class="proposta-cliente__destinatario-contato">
                <div class="proposta-cliente__campo"><span class="proposta-cliente__campo-rotulo">Contato</span><span class="proposta-cliente__campo-valor">{_safe(cliente.get("contato") or "-")}</span></div>
                <div class="proposta-cliente__campo"><span class="proposta-cliente__campo-rotulo">Telefone</span><span class="proposta-cliente__campo-valor">{_safe(cliente.get("telefone") or "-")}</span></div>
                <div class="proposta-cliente__campo"><span class="proposta-cliente__campo-rotulo">E-mail</span><span class="proposta-cliente__campo-valor">{_safe(cliente.get("email") or "-")}</span></div>
              </div>
              <div class="proposta-cliente__campo proposta-cliente__campo--wide"><span class="proposta-cliente__campo-rotulo">Endereço</span><span class="proposta-cliente__campo-valor">{_safe(cliente.get("endereco") or "-")}</span></div>
            </div>
          </section>
          <section class="proposta-cliente__bloco proposta-cliente__bloco--objeto">
            <h2 class="proposta-cliente__secao-titulo">Objeto da proposta</h2>
            <div class="proposta-cliente__objeto-card"><span class="proposta-cliente__campo-rotulo">Assunto</span><p class="proposta-cliente__objeto-assunto">{_safe(preview.get("titulo") or "-")}</p></div>
          </section>
          <section class="proposta-cliente__bloco"><h2 class="proposta-cliente__secao-titulo">Apresentação</h2><p class="proposta-cliente__texto-leitura">{_nl2br(saudacao)}</p></section>
        </div>
        {"".join(_secao_textual(s) for s in _secoes_corpo(secoes))}
        {investimento_html}
        {"".join(_secao_textual(s) for s in _secoes_pos_investimento(secoes))}
        {condicoes_html}
      </section>
      <section class="proposta-cliente__folha proposta-cliente__folha--aceite">
        <div class="proposta-cliente__cabecalho-resumido">{logo_resumido}<div class="proposta-cliente__cabecalho-resumido-texto"><strong>{_safe(numero)}</strong></div></div>
        <section class="proposta-cliente__bloco proposta-cliente__bloco--aceite">
          <h2 class="proposta-cliente__secao-titulo">Aceite e assinatura</h2>
          <div class="proposta-cliente__painel-corpo">
            <p class="proposta-cliente__texto-leitura proposta-cliente__texto-aceite">Ao assinar abaixo, o Cliente declara ter lido e aceito integralmente os termos desta proposta ({_safe(numero)}), autorizando a ZFW Engenharia a dar início aos serviços descritos.</p>
            <div class="proposta-cliente__assinaturas-duplas">
              <div><div class="proposta-cliente__assinatura-linha"></div><span class="proposta-cliente__assinatura-nome">Responsável comercial</span><span class="proposta-cliente__assinatura-empresa">ZFW Engenharia</span></div>
              <div><div class="proposta-cliente__assinatura-linha"></div><span class="proposta-cliente__assinatura-nome">{_safe(cliente.get("contato") or "Representante do cliente")}</span><span class="proposta-cliente__assinatura-empresa">{_safe(cliente.get("nome") or "Cliente")}</span></div>
            </div>
            <p class="proposta-cliente__data-assinatura">Data: ___ / ___ / ______</p>
          </div>
        </section>
      </section>
      {apendice_html}
      <footer class="proposta-cliente__folha-rodape"><span>{EMPRESA["razao"]} · CNPJ {EMPRESA["cnpj"]} · {_safe(numero)} · {_safe(_rotulo_revisao(preview.get("revisao")))} · Emitido em {_safe(_fmt_data_curta(preview.get("emissao")))}</span></footer>
    </article>
  </div>
</body>
</html>"""


def gerar_pdf_html_bytes(preview: dict) -> bytes | None:
    try:
        from weasyprint import HTML
    except Exception:
        return None
    return HTML(string=gerar_html_oferta(preview), base_url=str(_repo_root())).write_pdf()
