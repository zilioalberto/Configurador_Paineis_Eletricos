"""Utilitários para extração de texto de PDFs fiscais."""
from __future__ import annotations

import re
import unicodedata
from decimal import Decimal, InvalidOperation
from io import BytesIO

from pypdf import PdfReader

TXT_SIMPLES_NACIONAL = "simples nacional"


def extrair_texto_pdf(arquivo_bytes: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(arquivo_bytes))
    except Exception:
        return ""
    partes: list[str] = []
    for page in reader.pages:
        texto = page.extract_text() or ""
        partes.append(texto)
    return "\n".join(partes)


def normalizar_texto(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip()


def parse_moeda_br(valor_str: str | None) -> Decimal | None:
    if not valor_str:
        return None
    limpo = valor_str.strip().replace(".", "").replace(",", ".")
    limpo = re.sub(r"[^\d.\-]", "", limpo)
    if not limpo or limpo in {".", "-"}:
        return None
    try:
        return Decimal(limpo)
    except InvalidOperation:
        return None


def parse_data_br(valor_str: str | None):
    if not valor_str:
        return None
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", valor_str)
    if not m:
        return None
    from datetime import date

    dia, mes, ano = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        return date(ano, mes, dia)
    except ValueError:
        return None


def parse_competencia_mes_ano(texto: str) -> str | None:
    """Retorna AAAA-MM a partir de 03/2026, Março/2026, 03-2026 etc."""
    m = re.search(r"(\d{2})[/.-](\d{4})", texto)
    if m:
        mes, ano = int(m.group(1)), int(m.group(2))
        if 1 <= mes <= 12 and 2000 <= ano <= 2100:
            return f"{ano}-{mes:02d}"
    meses = {
        "janeiro": "01",
        "fevereiro": "02",
        "março": "03",
        "marco": "03",
        "abril": "04",
        "maio": "05",
        "junho": "06",
        "julho": "07",
        "agosto": "08",
        "setembro": "09",
        "outubro": "10",
        "novembro": "11",
        "dezembro": "12",
    }
    m2 = re.search(
        r"(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*/\s*(\d{4})",
        texto,
        re.IGNORECASE,
    )
    if m2:
        mes_nome = m2.group(1).lower().replace("ç", "c")
        return f"{m2.group(2)}-{meses[mes_nome]}"
    return None


def parse_cpf(texto: str) -> str:
    digits = re.sub(r"\D", "", texto)
    return digits[-11:] if len(digits) >= 11 else digits


def _texto_busca_pdf(texto: str) -> str:
    """Normaliza texto do PDF para buscas (remove acentos e padroniza espaços)."""
    s = unicodedata.normalize("NFKD", (texto or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s)


def _tem_composicao_simples(texto: str) -> bool:
    return bool(re.search(r"\b100[1245678]\b", texto or ""))


def _tem_composicao_darf(texto: str) -> bool:
    return bool(re.search(r"\b(1082|1099|0561|1138)\b", texto or ""))


def eh_documento_simples_nacional(nome_arquivo: str, texto: str, parsed: dict | None = None) -> bool:
    """True apenas para PDF do DAS / Simples Nacional (não DARF federal)."""
    nome = (nome_arquivo or "").lower()
    t = _texto_busca_pdf(texto)
    if "darf" in nome and "simples" not in nome:
        return False
    if "receitas federais" in t and TXT_SIMPLES_NACIONAL not in t:
        return False
    if parsed:
        linhas = parsed.get("linhas_composicao") or []
        if any(str(l.get("codigo") or "") in {"1001", "1002", "1004", "1005", "1006", "1008"} for l in linhas):
            return True
    if (
        TXT_SIMPLES_NACIONAL in t
        or "documento de arrecadacao do simples" in t
        or "pgdas" in t
        or "pg mei" in t
    ):
        return True
    if TXT_SIMPLES_NACIONAL in nome or ("simples" in nome and "nacional" in nome):
        return True
    return _tem_composicao_simples(texto) and not _tem_composicao_darf(texto)


def eh_documento_darf(nome_arquivo: str, texto: str) -> bool:
    nome = (nome_arquivo or "").lower()
    t = _texto_busca_pdf(texto)
    if "destda" in nome or "dest da" in nome:
        return False
    if "receitas estaduais" in t or "dare-sc" in t or "dare sc" in t:
        return False
    if eh_documento_simples_nacional(nome_arquivo, texto):
        return False
    if "darf" in nome:
        return True
    if "receitas federais" in t:
        return True
    if _tem_composicao_darf(texto):
        return True
    if "documento de arrecadacao" in t:
        return True
    return False


def detectar_tipo_anexo(nome_arquivo: str, texto: str) -> str:
    nome = (nome_arquivo or "").lower()
    t = _texto_busca_pdf(texto)
    if not t.strip():
        if TXT_SIMPLES_NACIONAL in nome or ("simples" in nome and "nacional" in nome):
            return "SIMPLES"
        if "darf" in nome:
            return "DARF"
        if "fgts" in nome:
            return "FGTS"
        if "iss" in nome:
            return "ISS"
        if "demonstrativo icms" in nome or ("icms" in nome and "destda" not in nome):
            return "DIME_ICMS"
        if "holerite" in nome or "recibo" in nome:
            return "HOLERITE"
        if "destda" in nome:
            return "OUTRO"
        return "OUTRO"
    if "demonstrativo de pagamento" in t or ("holerite" in nome and "recibo" not in nome):
        return "HOLERITE"
    if "recibo" in nome and "demonstrativo de pagamento" in t:
        return "HOLERITE"
    if eh_documento_simples_nacional(nome_arquivo, texto):
        return "SIMPLES"
    if eh_documento_darf(nome_arquivo, texto):
        return "DARF"
    if "fgts digital" in t or "gfd - guia do fgts" in t or "fgts" in nome:
        return "FGTS"
    if "iss vari" in t or "imposto sobre servi" in t or "iss" in nome:
        return "ISS"
    if "dime" in t or "declaração de informações do icms" in t or "demonstrativo icms" in nome or (
        "icms" in nome and "destda" not in nome
    ):
        return "DIME_ICMS"
    if "holerite" in nome or "recibo" in nome:
        return "HOLERITE"
    if "comprovante" in nome:
        return "COMPROVANTE"
    return "OUTRO"
