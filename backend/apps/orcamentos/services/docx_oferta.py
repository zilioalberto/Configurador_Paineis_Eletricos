"""Geração de oferta em DOCX editável para revisão comercial."""
from __future__ import annotations

import html
import io
import zipfile

from decimal import Decimal
from pathlib import Path

from django.utils import timezone

from apps.orcamentos.models import Orcamento
from apps.orcamentos.services.oferta_documento import (
    montar_corpo_proposta_texto,
    secoes_textuais_preview,
)
from apps.orcamentos.services.oferta_secoes import TIPOS_BLOCO_EXCLUIDOS_TEXTO
from apps.orcamentos.services.oferta_texto import (
    paragrafos_planos,
    texto_para_listing_docxtpl,
    texto_rich_paragrafos_docxtpl,
)
from apps.orcamentos.services.preview_oferta import montar_preview_oferta


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "ofertas"
# v8: layout ZFW com títulos/estilos por seção (melhor formatação no Word).
TEMPLATE_DOCX = TEMPLATE_DIR / "zfw_proposta_template_v8.docx"
# v9 (corpo único RichText) — descontinuado por qualidade visual inferior.
TEMPLATE_DOCX_CORPO_UNICO = TEMPLATE_DIR / "zfw_proposta_template_v9.docx"


CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"""

ROOT_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""

WORD_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
"""

STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TituloZfw">
    <w:name w:val="Titulo ZFW"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:color w:val="1F4E79"/>
      <w:sz w:val="34"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="SecaoZfw">
    <w:name w:val="Secao ZFW"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:color w:val="1F4E79"/>
      <w:sz w:val="26"/>
    </w:rPr>
  </w:style>
</w:styles>
"""


def _escape(value: object) -> str:
    return html.escape(str(value or ""), quote=False)


def _formatar_decimal(valor: str | Decimal | None) -> str:
    try:
        numero = Decimal(str(valor or "0"))
    except Exception:
        numero = Decimal("0")
    return f"{numero:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _formatar_data_iso(valor: str | None) -> str:
    if not valor:
        return "-"
    try:
        ano, mes, dia = valor[:10].split("-")
    except ValueError:
        return valor
    return f"{dia}/{mes}/{ano}"


def _nome_proprio_empresa(valor: str | None) -> str:
    from apps.orcamentos.services.formatacao_oferta import nome_proprio_empresa

    texto = nome_proprio_empresa(valor)
    return texto if texto else "-"


def _data_extenso(data) -> str:
    meses = (
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro",
    )
    return f"{data.day:02d} de {meses[data.month - 1]} de {data.year}"


def _texto_runs(texto: str) -> str:
    linhas = str(texto or "-").splitlines() or ["-"]
    partes = []
    for index, linha in enumerate(linhas):
        if index:
            partes.append("<w:br/>")
        partes.append(f"<w:t xml:space=\"preserve\">{_escape(linha)}</w:t>")
    return "".join(partes)


def _paragrafo(texto: str, *, estilo: str | None = None, bold: bool = False) -> str:
    ppr = f"<w:pPr><w:pStyle w:val=\"{estilo}\"/></w:pPr>" if estilo else ""
    rpr = "<w:rPr><w:b/></w:rPr>" if bold else ""
    return f"<w:p>{ppr}<w:r>{rpr}{_texto_runs(texto)}</w:r></w:p>"


def _page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def _celula(conteudo: str, *, bold: bool = False) -> str:
    rpr = "<w:rPr><w:b/></w:rPr>" if bold else ""
    return (
        "<w:tc><w:tcPr><w:tcW w:w=\"2400\" w:type=\"dxa\"/></w:tcPr>"
        f"<w:p><w:r>{rpr}{_texto_runs(conteudo)}</w:r></w:p></w:tc>"
    )


def _linha_tabela(colunas: list[str], *, header: bool = False) -> str:
    return "<w:tr>" + "".join(_celula(coluna, bold=header) for coluna in colunas) + "</w:tr>"


def _tabela(linhas: list[list[str]]) -> str:
    if not linhas:
        return ""
    rows = [_linha_tabela(linhas[0], header=True)]
    rows.extend(_linha_tabela(linha) for linha in linhas[1:])
    return (
        "<w:tbl>"
        "<w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/>"
        "<w:tblBorders>"
        "<w:top w:val=\"single\" w:sz=\"4\"/><w:left w:val=\"single\" w:sz=\"4\"/>"
        "<w:bottom w:val=\"single\" w:sz=\"4\"/><w:right w:val=\"single\" w:sz=\"4\"/>"
        "<w:insideH w:val=\"single\" w:sz=\"4\"/><w:insideV w:val=\"single\" w:sz=\"4\"/>"
        "</w:tblBorders></w:tblPr>"
        + "".join(rows)
        + "</w:tbl>"
    )


def _texto_lista(valor: str) -> str:
    return texto_para_listing_docxtpl(valor)


def _texto_lista_capitalizada(valor: str) -> str:
    from apps.orcamentos.services.formatacao_oferta import capitalizar_texto_tecnico

    return capitalizar_texto_tecnico(_texto_lista(valor))


def _rich_texto_paragrafos(valor: str, *, size: int = 24):
    """RichText com um parágrafo Word por bloco (``\\a``), estilo Arial."""
    try:
        from docxtpl import RichText
    except ImportError:  # pragma: no cover
        return texto_rich_paragrafos_docxtpl(valor)

    texto = str(valor or "").strip()
    rt = RichText()
    if not texto:
        rt.add("-", font="Arial", size=size)
        return rt
    rt.add(texto_rich_paragrafos_docxtpl(texto), font="Arial", size=size)
    return rt


def _linhas_investimento(preview: dict) -> list[list[str]]:
    investimento = preview["investimento"]
    linhas = [["Descrição", "NCM", "Qtd", "Un.", "Valor unit.", "Total"]]
    for item in investimento["itens"]:
        ncm = "".join(ch for ch in str(item.get("ncm") or "") if ch.isdigit()) or "-"
        linhas.append(
            [
                item.get("descricao") or "-",
                ncm,
                item.get("quantidade") or "1",
                item.get("unidade") or "un",
                f"R$ {_formatar_decimal(item.get('preco_unitario'))}",
                f"R$ {_formatar_decimal(item.get('subtotal'))}",
            ]
        )
    linhas.append(["", "", "", "Total da proposta", f"R$ {_formatar_decimal(preview['totais']['total'])}"])
    return linhas


def _paragrafos_corpo_xml(corpo: str) -> str:
    """Converte texto com ``## Título`` em parágrafos Word (fallback sem docxtpl)."""
    texto = str(corpo or "").strip()
    if not texto or texto == "-":
        return _paragrafo("-")

    partes: list[str] = []
    blocos = texto.split("\n\n## ")
    for index, bloco in enumerate(blocos):
        if index > 0:
            bloco = f"## {bloco}"
        linhas = bloco.split("\n", 1)
        if linhas[0].startswith("## "):
            titulo = linhas[0][3:].strip()
            conteudo = linhas[1].strip() if len(linhas) > 1 else ""
            partes.append(_paragrafo(titulo, estilo="SecaoZfw"))
            partes.append(_paragrafos_xml_de_conteudo(conteudo or "-"))
        else:
            partes.append(_paragrafos_xml_de_conteudo(bloco))
    return "".join(partes) if partes else _paragrafo("-")


def _paragrafos_xml_de_conteudo(valor: str, *, estilo: str | None = None) -> str:
    """Gera um ou mais parágrafos Word a partir do texto editado."""
    partes = []
    for paragrafo in paragrafos_planos(valor):
        partes.append(_paragrafo(paragrafo, estilo=estilo))
    return "".join(partes) if partes else _paragrafo("-", estilo=estilo)


def _secao_por_tipo(preview: dict, tipo: str) -> dict | None:
    for secao in preview["secoes"]:
        if secao.get("tipo") == tipo:
            return secao
    return None


def _texto_secao(preview: dict, tipo: str, fallback: str = "-") -> str:
    secao = _secao_por_tipo(preview, tipo)
    if not secao:
        return fallback
    return secao.get("conteudo") or fallback


def _itens_tabela_investimento(preview: dict) -> list[dict]:
    itens = []
    for index, item in enumerate(preview["investimento"]["itens"], start=1):
        itens.append(
            {
                "numero": str(index),
                "quantidade": item.get("quantidade") or "1",
                "descricao": item.get("descricao") or "-",
                "valor_unitario": f"R$ {_formatar_decimal(item.get('preco_unitario'))}",
                "valor_total": f"R$ {_formatar_decimal(item.get('subtotal'))}",
            }
        )
    return itens


def _contexto_docxtpl(preview: dict) -> dict:
    try:
        from docxtpl import Listing as listing_cls
    except ImportError:  # pragma: no cover
        listing_cls = str

    hoje = timezone.localdate()
    cliente = preview["cliente"]
    texto_intro = _texto_secao(preview, "INTRODUCAO", "")
    texto_escopo = _texto_secao(preview, "ESCOPO")

    return {
        "codigo_proposta": preview["codigo"],
        "cliente_nome": _nome_proprio_empresa(cliente.get("nome")),
        "contato_nome": cliente.get("contato") or "-",
        "contato_telefone": cliente.get("telefone") or "-",
        "data_emissao": hoje.strftime("%d/%m/%Y"),
        "data_emissao_extenso": _data_extenso(hoje),
        "titulo_proposta": preview["titulo"],
        "texto_introducao": texto_intro or (
            "Em atenção a sua consulta referenciada, temos o prazer de apresentar "
            "nossa oferta técnica/comercial para o fornecimento de:"
        ),
        "escopo_fornecimento": _rich_texto_paragrafos(texto_escopo),
        "itens_considerados": listing_cls(
            _texto_lista_capitalizada(_texto_secao(preview, "ITENS_FORNECIMENTO"))
        ),
        "servicos_considerados": listing_cls(
            _texto_lista_capitalizada(_texto_secao(preview, "SERVICOS"))
        ),
        "investimento_itens": _itens_tabela_investimento(preview),
        "exclusoes": listing_cls(_texto_lista(_texto_secao(preview, "EXCLUSOES"))),
        "observacoes": listing_cls(_texto_secao(preview, "OBSERVACOES")),
        "prazo_entrega": listing_cls(_texto_secao(preview, "PRAZO_ENTREGA", "À combinar.")),
        "condicoes_pagamento": listing_cls(
            _texto_lista(_texto_secao(preview, "CONDICOES_PAGAMENTO"))
        ),
        "condicoes_gerais": listing_cls(_texto_lista(_texto_secao(preview, "CONDICOES_GERAIS"))),
        "validade_texto": (
            f"A validade desta proposta é até {_formatar_data_iso(preview.get('validade'))}."
        ),
        "garantia_texto": listing_cls(_texto_secao(preview, "GARANTIA")),
        "total_proposta": f"R$ {_formatar_decimal(preview['totais']['total'])}",
    }


def _template_docx_ativo() -> Path:
    if TEMPLATE_DOCX.exists():
        return TEMPLATE_DOCX
    if TEMPLATE_DOCX_CORPO_UNICO.exists():
        return TEMPLATE_DOCX_CORPO_UNICO
    return TEMPLATE_DOCX


def _gerar_docx_template_zfw(preview: dict) -> bytes:
    from docxtpl import DocxTemplate

    template = _template_docx_ativo()
    doc = DocxTemplate(template)
    doc.render(_contexto_docxtpl(preview))
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def _documento_xml(preview: dict) -> str:
    hoje = timezone.localdate()
    cliente = preview["cliente"]
    partes = [
        _paragrafo("PROPOSTA TÉCNICA E COMERCIAL", estilo="TituloZfw"),
        _paragrafo(""),
        _paragrafo(f"Proposta de no: {preview['codigo']}"),
        _paragrafo(f"Para: {cliente.get('nome') or '-'}"),
        _paragrafo(f"Atenção: {cliente.get('contato') or '-'}"),
        _paragrafo(f"Joinville, {hoje.strftime('%d/%m/%Y')}"),
        _paragrafo(""),
        _paragrafo("Prezados(as) Senhores(as),"),
        _paragrafo(
            _texto_secao(
                preview,
                "INTRODUCAO",
                "Em atenção a sua consulta, temos o prazer de apresentar nossa "
                "oferta técnica/comercial para o fornecimento de:",
            )
        ),
        _page_break(),
    ]

    for secao in secoes_textuais_preview(preview):
        if secao.get("tipo") == "EXCLUSOES":
            continue
        titulo = secao.get("titulo") or secao.get("tipo") or "Seção"
        partes.append(_paragrafo(str(titulo), estilo="SecaoZfw"))
        partes.append(_paragrafos_xml_de_conteudo(secao.get("conteudo") or "-"))

    partes.extend(
        [
            _paragrafo("Investimento", estilo="SecaoZfw"),
            _tabela(_linhas_investimento(preview)),
            _paragrafo(""),
        ]
    )

    exclusoes = _texto_secao(preview, "EXCLUSOES")
    if exclusoes and exclusoes != "-":
        secao_exclusoes = _secao_por_tipo(preview, "EXCLUSOES")
        titulo_exclusoes = (
            (secao_exclusoes or {}).get("titulo") or "Exclusões"
        )
        partes.extend(
            [
                _paragrafo(str(titulo_exclusoes), estilo="SecaoZfw"),
                _paragrafos_xml_de_conteudo(exclusoes),
                _paragrafo(""),
            ]
        )

    partes.extend(
        [
            _paragrafo("Validade", estilo="SecaoZfw"),
            _paragrafo(f"A validade desta proposta é até {_formatar_data_iso(preview.get('validade'))}."),
            _page_break(),
            _paragrafo("Aprovação", estilo="SecaoZfw"),
            _paragrafo(f"Proposta: {preview['codigo']}", bold=True),
            _paragrafo("Responsavel: _________________________________"),
            _paragrafo("Nome: ______________________________________"),
            _paragrafo(""),
            _paragrafo("Favor colocar o carimbo da empresa abaixo"),
            _paragrafo(""),
            _paragrafo("Data: ___/___/______"),
            _paragrafo(""),
            _paragrafo("Qualquer dúvida, favor entrar em contato."),
            _paragrafo("Atenciosamente,"),
            _paragrafo("Alberto Zilio", bold=True),
            _paragrafo("ZFW ENGENHARIA EM CONTROLE E SISTEMAS LTDA"),
            _paragrafo("CNPJ: 07.284.171/0001-39"),
            _paragrafo("Telefone: +55 47 3473 7029"),
            _paragrafo("E-mail: zilio@zfw.com.br"),
            _paragrafo("Site: www.zfw.com.br"),
        ]
    )

    body = "".join(partes)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="11907" w:h="16839"/>
      <w:pgMar w:top="851" w:right="851" w:bottom="851" w:left="1134" w:header="283" w:footer="709" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"""


def nome_arquivo_docx_oferta(orcamento: Orcamento) -> str:
    codigo = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in orcamento.codigo)
    return f"{codigo or 'proposta'}_oferta.docx"


def gerar_docx_oferta_bytes(orcamento: Orcamento) -> bytes:
    """Retorna um DOCX editável para o fluxo comercial da proposta."""
    preview = montar_preview_oferta(orcamento)
    if _template_docx_ativo().exists():
        try:
            return _gerar_docx_template_zfw(preview)
        except ImportError:
            pass

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", CONTENT_TYPES_XML)
        docx.writestr("_rels/.rels", ROOT_RELS_XML)
        docx.writestr("word/_rels/document.xml.rels", WORD_RELS_XML)
        docx.writestr("word/styles.xml", STYLES_XML)
        docx.writestr("word/document.xml", _documento_xml(preview))
    return buffer.getvalue()
