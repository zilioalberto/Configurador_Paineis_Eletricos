"""Parser da resposta texto do ACBrMonitor (DistribuicaoDFePorUltNSU)."""
from __future__ import annotations

import re
from pathlib import Path

from .base import DistDfeDocumento, DistDfeResultado

_RE_NSU = re.compile(r"^0{0,15}\d{1,15}$")


def normalizar_nsu(valor: str | None, padrao: str = "000000000000000") -> str:
    digits = "".join(ch for ch in (valor or "") if ch.isdigit())
    if not digits:
        return padrao
    return digits.zfill(15)[-15:]


def parse_acbr_distribuicao_resposta(
    texto: str,
    *,
    output_dir: Path | None,
    ultimo_nsu_consulta: str,
) -> DistDfeResultado:
    """
    Interpreta blocos chave=valor do ACBrMonitor.
    Referência: https://acbr.sourceforge.io/ACBrMonitor/ModeloRespostaDistribuicaoDFePor.html
    """
    linhas = [ln.strip() for ln in texto.replace("\r", "").split("\n") if ln.strip()]
    kv: dict[str, str] = {}
    arquivos: list[str] = []
    for ln in linhas:
        if "=" not in ln:
            continue
        chave, _, valor = ln.partition("=")
        chave = chave.strip()
        valor = valor.strip()
        if chave.lower() == "arquivo" and valor:
            arquivos.append(valor)
        else:
            kv[chave] = valor

    cstat = kv.get("CStat") or kv.get("cStat") or ""
    xmotivo = kv.get("XMotivo") or kv.get("xMotivo") or kv.get("Msg") or ""
    ultimo_nsu = normalizar_nsu(kv.get("ultNSU") or kv.get("UltNSU"), ultimo_nsu_consulta)
    max_nsu = normalizar_nsu(kv.get("maxNSU") or kv.get("MaxNSU"), ultimo_nsu)

    documentos: list[DistDfeDocumento] = []
    if output_dir and arquivos:
        for nome in arquivos:
            path = output_dir / nome
            if not path.is_file():
                path = output_dir / Path(nome).name
            if not path.is_file():
                continue
            xml = path.read_text(encoding="utf-8", errors="replace").strip()
            if xml:
                documentos.append(
                    DistDfeDocumento(xml=xml, nome_arquivo=path.name),
                )

    return DistDfeResultado(
        cstat=cstat,
        xmotivo=xmotivo,
        ultimo_nsu=ultimo_nsu,
        max_nsu=max_nsu,
        documentos=documentos,
        resposta_bruta=texto,
    )
