"""Dispatcher de parsers de PDF fiscal."""
from __future__ import annotations

from .parsers.darf import parse_darf
from .parsers.dime_icms import parse_dime_icms
from .parsers.fgts import parse_fgts
from .parsers.holerite import parse_holerites
from .parsers.iss import parse_iss
from .parsers.simples import parse_simples
from .pdf_util import detectar_tipo_anexo, extrair_texto_pdf

PARSERS = {
    "DARF": parse_darf,
    "FGTS": parse_fgts,
    "ISS": parse_iss,
    "DIME_ICMS": parse_dime_icms,
    "SIMPLES": parse_simples,
    "HOLERITE": parse_holerites,
}


def parse_pdf_obrigacao(*, arquivo_bytes: bytes, nome_arquivo: str, tipo_forcado: str | None = None) -> dict:
    texto = extrair_texto_pdf(arquivo_bytes)
    if not texto.strip():
        tipo = tipo_forcado or detectar_tipo_anexo(nome_arquivo, "")
        return {
            "tipo_anexo": tipo,
            "sucesso": False,
            "erros": [
                "PDF sem texto extraível (escaneado). "
                "Informe os valores manualmente em Obrigações → Editar ou reenvie um PDF pesquisável."
            ],
            "texto": "",
            "texto_preview": "",
        }
    tipo = tipo_forcado or detectar_tipo_anexo(nome_arquivo, texto)
    parser = PARSERS.get(tipo)
    if not parser:
        return {
            "tipo_anexo": tipo,
            "sucesso": False,
            "erros": [f"Tipo de documento não suportado para parse automático: {tipo}."],
            "texto": texto[:5000],
        }
    resultado = parser(texto)
    resultado["tipo_anexo"] = tipo
    resultado["texto_preview"] = texto[:2000]
    return resultado
