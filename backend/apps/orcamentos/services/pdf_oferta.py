"""Geração do PDF da oferta comercial.

O anexo enviado por e-mail deve acompanhar a mesma estrutura visual da página
``/orcamentos/:id/oferta``. Mantemos a geração no backend com ReportLab para
não depender de um browser/headless no servidor.
"""
from __future__ import annotations

import io
import re
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from apps.orcamentos.services.formatacao_oferta import extrair_texto_item_lista, numero_proposta_exibicao
from apps.orcamentos.services.html_oferta import gerar_pdf_html_bytes, logo_oferta_path


DOC_AZUL = colors.HexColor("#3d6d8c")
DOC_AZUL_ESCURO = colors.HexColor("#2a4a62")
DOC_VERDE = colors.HexColor("#4a8f6e")
DOC_FUNDO = colors.HexColor("#f8fafb")
DOC_AZUL_SUAVE = colors.HexColor("#f3f7fa")
DOC_BORDA = colors.HexColor("#c5d0db")
DOC_BORDA_SUAVE = colors.HexColor("#dce4eb")
DOC_TEXTO = colors.HexColor("#2d3a4a")
DOC_TEXTO_SUAVE = colors.HexColor("#5c6d7e")
BRANCO = colors.white
RAIO_CARD = 6

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


def nome_arquivo_pdf_oferta(preview: dict) -> str:
    codigo = "".join(
        ch if ch.isalnum() or ch in ("-", "_") else "_"
        for ch in (preview.get("codigo") or "proposta")
    )
    return f"{codigo or 'proposta'}_oferta.pdf"


def _fmt_brl(valor: str) -> str:
    try:
        n = float(str(valor).replace(",", "."))
        return f"R$ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return str(valor or "-")


def _fmt_percentual(valor: str) -> str:
    try:
        n = float(str(valor).replace(",", "."))
        texto = f"{n:.2f}".replace(".", ",")
        return texto.rstrip("0").rstrip(",")
    except (TypeError, ValueError):
        return str(valor or "0")


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


def _rotulo_revisao(revisao: str | None) -> str:
    valor = (revisao or "").strip()
    if not valor:
        return "Rev. A"
    return valor if valor.lower().startswith("rev") else f"Rev. {valor}"


def _numero_proposta(preview: dict) -> str:
    return numero_proposta_exibicao(
        preview.get("codigo") or "",
        revisao=preview.get("revisao"),
        codigo_base=preview.get("codigo_base"),
    )


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


def _safe(texto) -> str:
    valor = "" if texto is None else str(texto)
    return escape(valor).replace("\n", "<br/>")


def _paragraphs_from_text(texto: str, style: ParagraphStyle) -> list[Paragraph]:
    linhas = [linha.strip() for linha in (texto or "").splitlines()]
    if not any(linhas):
        return [Paragraph("-", style)]

    flowables: list[Paragraph] = []
    lista_atual: list[str] = []

    def flush_lista() -> None:
        nonlocal lista_atual
        if lista_atual:
            html = "<br/>".join(f"• {_safe(item)}" for item in lista_atual)
            flowables.append(Paragraph(html, style))
            lista_atual = []

    for linha in linhas:
        if not linha:
            flush_lista()
            flowables.append(Spacer(1, 2 * mm))
            continue
        texto_item = extrair_texto_item_lista(linha)
        if texto_item is not None:
            lista_atual.append(texto_item)
            continue
        flush_lista()
        flowables.append(Paragraph(_safe(linha), style))
    flush_lista()
    return flowables


def _logo_path() -> Path | None:
    return logo_oferta_path()


def _logo(width: float = 48 * mm) -> Image | Paragraph:
    path = _logo_path()
    if not path:
        return Paragraph("<b>ZFW Engenharia</b>", _styles()["body_bold"])
    img = Image(str(path))
    ratio = img.imageHeight / img.imageWidth if img.imageWidth else 0.27
    img.drawWidth = width
    img.drawHeight = width * ratio
    img.hAlign = "LEFT"
    return img


def _rounded_card_commands(
    *,
    border=DOC_BORDA_SUAVE,
    background=BRANCO,
    radius: float = RAIO_CARD,
    border_width: float = 0.7,
) -> list[tuple]:
    return [
        ("BOX", (0, 0), (-1, -1), border_width, border),
        ("ROUNDEDCORNERS", [radius, radius, radius, radius]),
        ("BACKGROUND", (0, 0), (-1, -1), background),
    ]


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "OfertaBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=13,
            textColor=DOC_TEXTO,
            spaceAfter=3,
        ),
        "body_small": ParagraphStyle(
            "OfertaBodySmall",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=9.5,
            textColor=DOC_TEXTO_SUAVE,
        ),
        "body_bold": ParagraphStyle(
            "OfertaBodyBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.7,
            leading=12,
            textColor=DOC_TEXTO,
        ),
        "section": ParagraphStyle(
            "OfertaSection",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=9,
            textColor=DOC_VERDE,
            uppercase=True,
            spaceBefore=8,
            spaceAfter=5,
            letterSpacing=1,
        ),
        "meta_title": ParagraphStyle(
            "OfertaMetaTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            leading=8,
            textColor=DOC_AZUL_ESCURO,
            alignment=TA_LEFT,
        ),
        "meta_label": ParagraphStyle(
            "OfertaMetaLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6,
            leading=8,
            textColor=DOC_TEXTO_SUAVE,
        ),
        "meta_value": ParagraphStyle(
            "OfertaMetaValue",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.4,
            leading=10,
            textColor=DOC_AZUL_ESCURO,
        ),
        "footer": ParagraphStyle(
            "OfertaFooter",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=6.2,
            leading=8,
            textColor=DOC_TEXTO_SUAVE,
        ),
        "center": ParagraphStyle(
            "OfertaCenter",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=13,
            textColor=DOC_TEXTO,
            alignment=TA_CENTER,
        ),
        "right": ParagraphStyle(
            "OfertaRight",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.3,
            leading=11,
            textColor=DOC_TEXTO,
            alignment=TA_RIGHT,
        ),
    }


def _section_heading(titulo: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(_safe(_titulo_secao(titulo)), styles["section"])


def _stack(flowables: list) -> list:
    return flowables


def _cell(label: str, value: str, styles: dict[str, ParagraphStyle]) -> list[Paragraph]:
    return _stack([
        Paragraph(_safe(label.upper()), styles["meta_label"]),
        Paragraph(_safe(value or "-"), styles["meta_value"]),
    ])


def _header(preview: dict, styles: dict[str, ParagraphStyle]) -> Table:
    numero = _numero_proposta(preview)
    meta = Table(
        [
            [Paragraph("OFERTA COMERCIAL", styles["meta_title"]), ""],
            [_cell("Número", numero, styles), _cell("Revisão", _rotulo_revisao(preview.get("revisao")), styles)],
            [_cell("Emissão", _fmt_data_curta(preview.get("emissao")), styles), _cell("Validade", _fmt_data_curta(preview.get("validade")), styles)],
        ],
        colWidths=[28 * mm, 28 * mm],
    )
    meta.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 0), (-1, 0)),
                *_rounded_card_commands(border=DOC_BORDA, background=BRANCO, border_width=0.8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    contato = (
        f"{EMPRESA['linha1']} · {EMPRESA['linha2']}<br/>"
        f"{EMPRESA['fone']} · {EMPRESA['email']}<br/>"
        f"{EMPRESA['site']} · CNPJ {EMPRESA['cnpj']}"
    )
    left = [_logo(), Spacer(1, 3 * mm), Paragraph(contato, styles["body_small"])]
    table = Table([[left, meta]], colWidths=[105 * mm, 60 * mm])
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return table


def _destinatario(preview: dict, styles: dict[str, ParagraphStyle]) -> list:
    cliente = preview.get("cliente") or {}
    rows = [
        [
            _cell("Empresa", cliente.get("nome") or "-", styles),
            _cell("CNPJ", cliente.get("cnpj") or "-", styles),
        ],
        [
            _cell("Contato", cliente.get("contato") or "-", styles),
            _cell("Telefone", cliente.get("telefone") or "-", styles),
            _cell("E-mail", cliente.get("email") or "-", styles),
        ],
        [_cell("Endereço", cliente.get("endereco") or "-", styles), "", ""],
    ]
    table = Table(rows, colWidths=[55 * mm, 55 * mm, 55 * mm])
    table.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 0), (1, 0)),
                ("SPAN", (0, 2), (-1, 2)),
                *_rounded_card_commands(border=DOC_BORDA_SUAVE, background=BRANCO),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return [_section_heading("Destinatário", styles), table]


def _objeto(preview: dict, styles: dict[str, ParagraphStyle]) -> list:
    conteudo = _stack([
        Paragraph("ASSUNTO", styles["meta_label"]),
        Paragraph(_safe(preview.get("titulo") or "-"), styles["meta_value"]),
    ])
    table = Table([[conteudo]], colWidths=[165 * mm])
    table.setStyle(
        TableStyle(
            [
                *_rounded_card_commands(border=colors.HexColor("#d8e6ef"), background=DOC_AZUL_SUAVE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return [_section_heading("Objeto da proposta", styles), table]


def _secao_introducao(preview: dict) -> dict | None:
    for secao in preview.get("secoes") or []:
        if secao.get("tipo") == "INTRODUCAO" and (secao.get("conteudo") or "").strip():
            return secao
    return None


def _secoes_corpo(preview: dict) -> list[dict]:
    secoes = []
    for secao in preview.get("secoes") or []:
        tipo = secao.get("tipo")
        tem_intro = tipo == "INTRODUCAO" and (secao.get("conteudo") or "").strip()
        if tem_intro:
            continue
        if tipo in TIPOS_CONDICOES_COMERCIAIS or tipo in TIPOS_APOS_INVESTIMENTO:
            continue
        if (secao.get("titulo") or secao.get("conteudo") or "").strip():
            secoes.append(secao)
    return secoes


def _secoes_apos_investimento(preview: dict) -> list[dict]:
    return [
        s
        for s in (preview.get("secoes") or [])
        if s.get("tipo") in TIPOS_APOS_INVESTIMENTO
        and (s.get("titulo") or s.get("conteudo") or "").strip()
    ]


def _secoes_condicoes(preview: dict) -> list[dict]:
    return [
        s
        for s in (preview.get("secoes") or [])
        if s.get("tipo") in TIPOS_CONDICOES_COMERCIAIS
        and (s.get("conteudo") or "").strip()
    ]


def _bloco_textual(secao: dict, styles: dict[str, ParagraphStyle]) -> list:
    story = [_section_heading(secao.get("titulo") or "", styles)]
    story.extend(_paragraphs_from_text(secao.get("conteudo") or "-", styles["body"]))
    return story


def _linhas_descricao(descricao: str) -> tuple[str, str]:
    texto = (descricao or "").strip()
    if not texto:
        return "-", ""
    if "\n" not in texto:
        return texto, ""
    titulo, detalhe = texto.split("\n", 1)
    return titulo.strip() or "-", detalhe.strip()


def _investimento(preview: dict, styles: dict[str, ParagraphStyle]) -> list:
    inv = preview.get("investimento") or {}
    itens = inv.get("itens") or []
    if not itens:
        return []

    header_style = ParagraphStyle(
        "OfertaTableHeader",
        parent=styles["meta_label"],
        textColor=DOC_TEXTO,
        alignment=TA_LEFT,
    )
    num_style = ParagraphStyle("OfertaNum", parent=styles["body_small"], alignment=TA_RIGHT)
    center_style = ParagraphStyle("OfertaTableCenter", parent=styles["body_small"], alignment=TA_CENTER)
    item_title = ParagraphStyle(
        "OfertaItemTitle",
        parent=styles["body_bold"],
        fontSize=8,
        leading=10.5,
    )
    item_detail = ParagraphStyle(
        "OfertaItemDetail",
        parent=styles["body_small"],
        fontSize=7.4,
        leading=9.5,
    )

    data = [
        [
            Paragraph("DESCRIÇÃO", header_style),
            Paragraph("NCM", ParagraphStyle("OfertaHeaderCenter", parent=header_style, alignment=TA_CENTER)),
            Paragraph("QTD.", ParagraphStyle("OfertaHeaderRight", parent=header_style, alignment=TA_RIGHT)),
            Paragraph("UN.", ParagraphStyle("OfertaHeaderUn", parent=header_style, alignment=TA_CENTER)),
            Paragraph("VALOR UNIT.", ParagraphStyle("OfertaHeaderRight2", parent=header_style, alignment=TA_RIGHT)),
            Paragraph("TOTAL", ParagraphStyle("OfertaHeaderRight3", parent=header_style, alignment=TA_RIGHT)),
        ]
    ]
    for linha in itens:
        titulo, detalhe = _linhas_descricao(linha.get("descricao") or "")
        desc = [Paragraph(_safe(titulo), item_title)]
        if detalhe:
            desc.append(Paragraph(_safe(detalhe), item_detail))
        if linha.get("codigo"):
            desc.append(Paragraph(_safe(linha.get("codigo")), item_detail))
        data.append(
            [
                _stack(desc),
                Paragraph(_safe(re.sub(r"\D", "", linha.get("ncm") or "") or "-"), center_style),
                Paragraph(_safe(linha.get("quantidade") or "1"), num_style),
                Paragraph(_safe((linha.get("unidade") or "un").strip() or "un"), center_style),
                Paragraph(_fmt_brl(linha.get("preco_unitario") or "0"), num_style),
                Paragraph(_fmt_brl(linha.get("subtotal") or "0"), num_style),
            ]
        )

    table = Table(data, colWidths=[70 * mm, 17 * mm, 14 * mm, 13 * mm, 25 * mm, 26 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("ROUNDEDCORNERS", [RAIO_CARD, RAIO_CARD, RAIO_CARD, RAIO_CARD]),
                ("GRID", (0, 0), (-1, -1), 0.55, DOC_BORDA),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f4f6f8")),
                ("BACKGROUND", (0, 1), (-1, -1), BRANCO),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story = [_section_heading(inv.get("titulo") or "Investimento", styles), table]
    story.extend(_resumo_financeiro(preview.get("totais") or {}, styles))
    return story


def _resumo_financeiro(totais: dict, styles: dict[str, ParagraphStyle]) -> list:
    rows = []
    if totais.get("desconto_ativo"):
        rows.append(["Subtotal", _fmt_brl(totais.get("subtotal"))])
        pct = _fmt_percentual(totais.get("desconto_percentual"))
        rows.append([f"Desconto ({pct}%)", f"- {_fmt_brl(totais.get('desconto_valor'))}"])
    rows.append(["Total geral", _fmt_brl(totais.get("total"))])
    data = [[Paragraph(_safe(label), styles["body_bold"]), Paragraph(_safe(valor), styles["right"])] for label, valor in rows]
    table = Table(data, colWidths=[45 * mm, 35 * mm], hAlign="RIGHT")
    table.setStyle(
        TableStyle(
            [
                ("LINEABOVE", (0, -1), (-1, -1), 0.6, DOC_BORDA),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return [Spacer(1, 4 * mm), table]


def _condicoes(preview: dict, styles: dict[str, ParagraphStyle]) -> list:
    secoes = _secoes_condicoes(preview)
    if not secoes:
        return []
    story = [_section_heading("Condições comerciais", styles)]
    for secao in secoes:
        conteudo = [Paragraph(_safe(_titulo_secao(secao.get("titulo") or "")), styles["meta_label"])]
        conteudo.extend(_paragraphs_from_text(secao.get("conteudo") or "-", styles["body"]))
        table = Table([[_stack(conteudo)]], colWidths=[165 * mm])
        table.setStyle(
        TableStyle(
            [
                    *_rounded_card_commands(border=DOC_BORDA_SUAVE, background=BRANCO),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(KeepTogether([table, Spacer(1, 4 * mm)]))
    return story


def _aceite(preview: dict, styles: dict[str, ParagraphStyle]) -> list:
    cliente = preview.get("cliente") or {}
    texto = (
        "Ao assinar abaixo, o Cliente declara ter lido e aceito integralmente os termos desta "
        f"proposta ({_numero_proposta(preview)}), autorizando a ZFW Engenharia a dar início aos "
        "serviços descritos."
    )
    assinatura = Table(
        [
            ["", ""],
            [
                Paragraph("Responsável comercial<br/><font color='#5c6d7e'>ZFW Engenharia</font>", styles["center"]),
                Paragraph(
                    f"{_safe(cliente.get('contato') or 'Representante do cliente')}<br/>"
                    f"<font color='#5c6d7e'>{_safe(cliente.get('nome') or 'Cliente')}</font>",
                    styles["center"],
                ),
            ],
        ],
        colWidths=[75 * mm, 75 * mm],
    )
    assinatura.setStyle(
        TableStyle(
            [
                ("LINEBELOW", (0, 0), (-1, 0), 0.8, DOC_BORDA),
                ("TOPPADDING", (0, 0), (-1, 0), 24 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 3 * mm),
                ("LEFTPADDING", (0, 0), (-1, -1), 8 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8 * mm),
            ]
        )
    )
    painel = Table(
        [[
            _stack([
                Paragraph(_safe(texto), styles["body"]),
                Spacer(1, 5 * mm),
                assinatura,
                Spacer(1, 8 * mm),
                Paragraph("Data: ___ / ___ / ______", styles["body_small"]),
            ])
        ]],
        colWidths=[165 * mm],
    )
    painel.setStyle(
        TableStyle(
            [
                *_rounded_card_commands(border=DOC_BORDA_SUAVE, background=BRANCO),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return [
        PageBreak(),
        *_cabecalho_resumido(preview, styles),
        _section_heading("Aceite e assinatura", styles),
        painel,
    ]


def _cabecalho_resumido(preview: dict, styles: dict[str, ParagraphStyle]) -> list:
    header = Table([[_logo(28 * mm), Paragraph(_safe(_numero_proposta(preview)), styles["body_bold"])]], colWidths=[34 * mm, 130 * mm])
    header.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    return [header, HRFlowable(width="100%", thickness=0.5, color=DOC_BORDA_SUAVE), Spacer(1, 4 * mm)]


def _apendice(preview: dict, styles: dict[str, ParagraphStyle]) -> list:
    apendice = preview.get("apendice_legal") or {}
    secoes = apendice.get("secoes") or []
    if not secoes:
        return []
    story = [
        PageBreak(),
        *_cabecalho_resumido(preview, styles),
        _section_heading("Termos e condições gerais", styles),
        Paragraph(f"Apêndice · versão {_safe(apendice.get('versao') or '-')}", styles["body_small"]),
    ]
    for index, bloco in enumerate(secoes, start=1):
        conteudo = _stack([
            Paragraph(
                f"<font color='#4a8f6e'><b>{index}.</b></font> <b>{_safe(bloco.get('titulo') or '')}</b>",
                styles["body_bold"],
            ),
            Paragraph(_safe(bloco.get("conteudo") or "-"), styles["body_small"]),
        ])
        table = Table([[conteudo]], colWidths=[165 * mm])
        table.setStyle(
        TableStyle(
            [
                    *_rounded_card_commands(border=DOC_BORDA_SUAVE, background=BRANCO, border_width=0.6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(KeepTogether([Spacer(1, 3 * mm), table]))
    return story


def _footer(canvas, doc, preview: dict, styles: dict[str, ParagraphStyle]) -> None:
    canvas.saveState()
    canvas.setFillColor(DOC_FUNDO)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(DOC_BORDA)
    canvas.setLineWidth(0.5)
    y = 11 * mm
    canvas.line(doc.leftMargin, y + 5 * mm, A4[0] - doc.rightMargin, y + 5 * mm)
    canvas.setFillColor(DOC_TEXTO_SUAVE)
    canvas.setFont("Helvetica", 6.2)
    texto = (
        f"{EMPRESA['razao']} · CNPJ {EMPRESA['cnpj']} · {_numero_proposta(preview)} · "
        f"{_rotulo_revisao(preview.get('revisao'))} · Emitido em {_fmt_data_curta(preview.get('emissao'))}"
    )
    canvas.drawString(doc.leftMargin, y, texto[:145])
    canvas.drawRightString(A4[0] - doc.rightMargin, y, f"Página {doc.page}")
    canvas.restoreState()


def gerar_pdf_oferta_bytes(preview: dict) -> bytes:
    html_pdf = gerar_pdf_html_bytes(preview)
    if html_pdf:
        return html_pdf

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=13 * mm,
        leftMargin=13 * mm,
        topMargin=11 * mm,
        bottomMargin=18 * mm,
        title=nome_arquivo_pdf_oferta(preview),
        author=EMPRESA["razao"],
    )
    styles = _styles()
    story: list = []

    story.append(_header(preview, styles))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=0.6, color=DOC_BORDA))
    story.append(Spacer(1, 5 * mm))
    story.extend(_destinatario(preview, styles))
    story.extend(_objeto(preview, styles))

    intro = _secao_introducao(preview)
    saudacao = (intro or {}).get("conteudo") or _texto_saudacao_padrao(preview.get("perfil_oferta"))
    story.append(_section_heading("Apresentação", styles))
    story.extend(_paragraphs_from_text(saudacao, styles["body"]))

    for secao in _secoes_corpo(preview):
        story.extend(_bloco_textual(secao, styles))

    story.extend(_investimento(preview, styles))

    for secao in _secoes_apos_investimento(preview):
        story.extend(_bloco_textual(secao, styles))

    story.extend(_condicoes(preview, styles))
    story.extend(_aceite(preview, styles))
    story.extend(_apendice(preview, styles))

    footer = lambda canvas, doc_obj: _footer(canvas, doc_obj, preview, styles)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
