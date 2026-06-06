"""Formatação de texto para oferta comercial (compartilhado entre prévia, DOCX e blocos)."""
from __future__ import annotations

import re

_SIGLAS = {
    "ca",
    "cc",
    "clp",
    "cnc",
    "ihm",
    "io",
    "i/o",
    "plc",
    "siemens",
    "zfw",
    "vcc",
    "vca",
    "na",
    "nf",
    "ma",
}

def _predominantemente_maiusculo(texto: str) -> bool:
    letras = [c for c in texto if c.isalpha()]
    if len(letras) < 3:
        return False
    maiusculas = sum(1 for c in letras if c.isupper())
    return maiusculas / len(letras) >= 0.75


def _aplicar_tokens_tecnicos(texto: str) -> str:
    resultado = texto
    resultado = re.sub(
        r"ac(\d+):([a-z0-9]+)",
        lambda m: f"AC{m.group(1)}:{m.group(2).upper()}",
        resultado,
        flags=re.IGNORECASE,
    )
    resultado = re.sub(
        r"\bac(\d+)\b",
        lambda m: f"AC{m.group(1)}",
        resultado,
        flags=re.IGNORECASE,
    )
    resultado = re.sub(
        r"\b(\d+)(vcc|vca|na|nf|ma)\b",
        lambda m: f"{m.group(1)}{m.group(2).upper()}",
        resultado,
        flags=re.IGNORECASE,
    )
    for sigla in sorted(_SIGLAS, key=len, reverse=True):
        resultado = re.sub(
            rf"\b{re.escape(sigla)}\b",
            sigla.upper(),
            resultado,
            flags=re.IGNORECASE,
        )
    return resultado


def _iniciar_frase(texto: str) -> str:
    chars = list(texto)
    for index, char in enumerate(chars):
        if char.isalpha():
            chars[index] = char.upper()
            break
    return "".join(chars)


def capitalizar_texto_tecnico(valor: str) -> str:
    """Converte texto em caixa alta (catálogo) para frase legível, preservando siglas técnicas."""
    texto = str(valor or "")
    if not texto.strip():
        return texto

    linhas_formatadas = []
    for linha in texto.splitlines():
        conteudo = linha.strip()
        if not conteudo:
            linhas_formatadas.append(linha)
            continue
        if not _predominantemente_maiusculo(conteudo):
            linhas_formatadas.append(linha)
            continue

        minusculo = conteudo.lower()
        linhas_formatadas.append(_aplicar_tokens_tecnicos(_iniciar_frase(minusculo)))
    return "\n".join(linhas_formatadas)


def formatar_descricao_item_oferta(valor: str) -> str:
    texto = str(valor or "").strip()
    if not texto:
        return ""
    if not _predominantemente_maiusculo(texto):
        return texto
    return capitalizar_texto_tecnico(texto)


def formatar_conteudo_lista_oferta(conteudo: str) -> str:
    """Formata itens de lista (- item;) gerados a partir do catálogo em caixa alta."""
    if not str(conteudo or "").strip():
        return conteudo or ""

    linhas_saida: list[str] = []
    for linha in str(conteudo).splitlines():
        limpa = linha.strip()
        if not limpa:
            linhas_saida.append(linha)
            continue
        if limpa.startswith("- "):
            corpo = limpa[2:].rstrip(";").strip()
            formatado = formatar_descricao_item_oferta(corpo)
            linhas_saida.append(f"- {formatado};" if formatado else "- ;")
            continue
        linhas_saida.append(
            capitalizar_texto_tecnico(linha) if _predominantemente_maiusculo(linha) else linha
        )
    return "\n".join(linhas_saida)


def _cep_exibicao(cep: str) -> str:
    digitos = "".join(c for c in str(cep or "") if c.isdigit())
    if len(digitos) == 8:
        return f"{digitos[:5]}-{digitos[5:]}"
    return digitos


def _formatar_campo_endereco(valor: str, *, uf: bool = False) -> str:
    """Primeira letra maiúscula por palavra (como razão social); UF sempre em caixa alta."""
    texto = str(valor or "").strip()
    if not texto:
        return ""
    if uf:
        return texto.upper()[:2]
    if _predominantemente_maiusculo(texto):
        return nome_proprio_empresa(texto)
    return texto


def cnpj_exibicao(documento: str | None) -> str:
    """CNPJ/CPF do parceiro com máscara 00.000.000/0000-00 quando possível."""
    digitos = "".join(c for c in str(documento or "") if c.isdigit())
    if len(digitos) == 14:
        return (
            f"{digitos[:2]}.{digitos[2:5]}.{digitos[5:8]}/"
            f"{digitos[8:12]}-{digitos[12:]}"
        )
    if len(digitos) == 11:
        return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"
    return str(documento or "").strip()


def formatar_endereco_parceiro(endereco) -> str:
    """Linha única para oferta: logradouro, cidade e CEP."""
    if endereco is None:
        return ""

    linha1 = ", ".join(
        parte
        for parte in (
            _formatar_campo_endereco(getattr(endereco, "logradouro", "")),
            str(getattr(endereco, "numero", "") or "").strip(),
            _formatar_campo_endereco(getattr(endereco, "complemento", "")),
            _formatar_campo_endereco(getattr(endereco, "bairro", "")),
        )
        if parte
    )
    municipio = _formatar_campo_endereco(getattr(endereco, "municipio", ""))
    uf = _formatar_campo_endereco(getattr(endereco, "uf", ""), uf=True)
    cidade = " / ".join(p for p in (municipio, uf) if p)
    cep = _cep_exibicao(str(getattr(endereco, "cep", "") or ""))
    sufixo = " — ".join(p for p in (cidade, f"CEP {cep}" if cep else "") if p)
    if linha1 and sufixo:
        return f"{linha1} — {sufixo}"
    return linha1 or sufixo


def endereco_exibicao_parceiro(parceiro) -> str:
    """Endereço principal do parceiro (ou o primeiro com dados úteis)."""
    if parceiro is None:
        return ""

    from apps.cadastros.models import EnderecoParceiro

    base = EnderecoParceiro.objects.filter(parceiro_id=parceiro.pk)
    candidatos = [
        base.filter(principal=True).order_by("pk").first(),
        base.order_by("-principal", "pk").first(),
    ]
    vistos: set[int] = set()
    for endereco in candidatos:
        if endereco is None or endereco.pk in vistos:
            continue
        vistos.add(endereco.pk)
        texto = formatar_endereco_parceiro(endereco)
        if texto:
            return texto

    for endereco in base.order_by("-principal", "pk"):
        if endereco.pk in vistos:
            continue
        texto = formatar_endereco_parceiro(endereco)
        if texto:
            return texto
    return ""


def nome_proprio_empresa(valor: str | None) -> str:
    """Razão social: iniciais maiúsculas; artigos em minúsculo; siglas jurídicas preservadas."""
    texto = str(valor or "").strip()
    if not texto:
        return ""

    manter_maiusculo = {
        "cnc",
        "eireli",
        "epp",
        "ii",
        "iii",
        "iv",
        "ltda",
        "me",
        "mei",
        "sa",
        "s/a",
        "ss",
        "zfw",
    }
    minusculas = {"a", "as", "ao", "aos", "da", "das", "de", "do", "dos", "e"}
    palavras = []
    for index, palavra in enumerate(texto.lower().split()):
        limpa = palavra.strip(".,;:()")
        if limpa in manter_maiusculo:
            palavras.append(palavra.upper())
        elif index > 0 and limpa in minusculas:
            palavras.append(palavra)
        else:
            palavras.append(palavra[:1].upper() + palavra[1:])
    return " ".join(palavras)
