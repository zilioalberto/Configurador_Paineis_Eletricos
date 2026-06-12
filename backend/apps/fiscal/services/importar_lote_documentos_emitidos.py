"""Importação em lote de XMLs de documentos fiscais emitidos."""
from __future__ import annotations

from typing import TypedDict

from apps.fiscal.services.documento_emitido_parser import (
    DocumentoEmitidoParserError,
    detectar_tipo_documento_emitido,
)
from apps.fiscal.services.importar_xml_documento_emitido_service import (
    importar_xml_documento_emitido,
)


class ResultadoItemLote(TypedDict):
    indice: int
    sucesso: bool
    created: bool
    documento_id: int | None
    identificador: str
    mensagem: str


class ResultadoLoteImportacao(TypedDict):
    total: int
    criados: int
    duplicados: int
    erros: int
    itens: list[ResultadoItemLote]


def importar_lote_xmls_emitidos(
    xmls: list[str],
    *,
    classificar_automaticamente: bool = True,
) -> ResultadoLoteImportacao:
    itens: list[ResultadoItemLote] = []
    criados = 0
    duplicados = 0
    erros = 0

    for indice, xml in enumerate(xmls):
        texto = (xml or "").strip()
        if not texto:
            erros += 1
            itens.append(
                {
                    "indice": indice,
                    "sucesso": False,
                    "created": False,
                    "documento_id": None,
                    "identificador": "",
                    "mensagem": "XML vazio.",
                }
            )
            continue
        try:
            tipo = detectar_tipo_documento_emitido(texto)
            resultado = importar_xml_documento_emitido(
                xml=texto,
                tipo_documento=tipo,
                classificar_automaticamente=classificar_automaticamente,
            )
            if resultado["created"]:
                criados += 1
            else:
                duplicados += 1
            doc = resultado["documento"]
            itens.append(
                {
                    "indice": indice,
                    "sucesso": True,
                    "created": resultado["created"],
                    "documento_id": doc.id,
                    "identificador": doc.identificador,
                    "mensagem": resultado["message"],
                }
            )
        except DocumentoEmitidoParserError as exc:
            erros += 1
            itens.append(
                {
                    "indice": indice,
                    "sucesso": False,
                    "created": False,
                    "documento_id": None,
                    "identificador": "",
                    "mensagem": str(exc),
                }
            )

    return {
        "total": len(xmls),
        "criados": criados,
        "duplicados": duplicados,
        "erros": erros,
        "itens": itens,
    }
