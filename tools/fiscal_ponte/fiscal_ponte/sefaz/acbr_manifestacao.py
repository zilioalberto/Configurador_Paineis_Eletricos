"""Manifestação do destinatário via ACBrMonitor NFe.EnviarEvento."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from .acbr_tcp import enviar_comando_acbr

TP_EVENTO = {
    "CIENCIA": "210210",
    "CONFIRMACAO": "210200",
    "DESCONHECIMENTO": "210220",
    "NAO_REALIZADA": "210240",
}

_CSTAT_SUCESSO = {"128", "135", "136"}


@dataclass
class ResultadoManifestacaoAcbr:
    sucesso: bool
    cstat: str
    motivo: str
    protocolo: str
    resposta_bruta: str


def montar_ini_evento_manifestacao(
    *,
    chave_acesso: str,
    cnpj: str,
    tipo: str,
    justificativa: str = "",
) -> str:
    tp = TP_EVENTO.get(tipo)
    if not tp:
        raise ValueError(f"Tipo de manifestação inválido: {tipo}")
    chave = "".join(c for c in chave_acesso if c.isdigit())
    if len(chave) != 44:
        raise ValueError("Chave de acesso deve ter 44 dígitos.")
    cnpj_digits = "".join(c for c in cnpj if c.isdigit())
    c_orgao = chave[:2]
    try:
        dh = datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%d/%m/%Y %H:%M:%S")
    except Exception:
        dh = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    linhas = [
        "[EVENTO]",
        "idLote=1",
        "[EVENTO001]",
        f"cOrgao={c_orgao}",
        f"CNPJ={cnpj_digits}",
        f"chNFe={chave}",
        f"dhEvento={dh}",
        f"tpEvento={tp}",
        "nSeqEvento=1",
        "versaoEvento=1.00",
    ]
    if tipo == "NAO_REALIZADA" and justificativa.strip():
        linhas.append(f"xJust={justificativa.strip()}")
    return "\n".join(linhas)


def parse_resposta_manifestacao(texto: str) -> ResultadoManifestacaoAcbr:
    kv: dict[str, str] = {}
    for ln in texto.replace("\r", "").split("\n"):
        if "=" not in ln:
            continue
        k, _, v = ln.strip().partition("=")
        kv[k.strip()] = v.strip()
    cstat = kv.get("CStat") or kv.get("cStat") or ""
    motivo = kv.get("XMotivo") or kv.get("xMotivo") or kv.get("Msg") or ""
    protocolo = kv.get("nProt") or kv.get("Protocolo") or ""
    if not protocolo:
        match = re.search(r"nProt=(\d+)", texto)
        if match:
            protocolo = match.group(1)
    sucesso = cstat in _CSTAT_SUCESSO
    return ResultadoManifestacaoAcbr(
        sucesso=sucesso,
        cstat=cstat,
        motivo=motivo,
        protocolo=protocolo,
        resposta_bruta=texto,
    )


class AcbrManifestacaoClient:
    def __init__(self, *, host: str, port: int, timeout_sec: int) -> None:
        self._host = host
        self._port = port
        self._timeout = timeout_sec

    def enviar_manifestacao(
        self,
        *,
        chave_acesso: str,
        cnpj: str,
        tipo: str,
        justificativa: str = "",
    ) -> ResultadoManifestacaoAcbr:
        ini = montar_ini_evento_manifestacao(
            chave_acesso=chave_acesso,
            cnpj=cnpj,
            tipo=tipo,
            justificativa=justificativa,
        )
        comando = f'NFe.EnviarEvento("{ini}")'
        resposta = enviar_comando_acbr(
            host=self._host,
            port=self._port,
            comando=comando,
            timeout_sec=self._timeout,
        )
        return parse_resposta_manifestacao(resposta)
