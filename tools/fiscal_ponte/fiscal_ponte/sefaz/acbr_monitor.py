"""Consulta DistDFe via ACBrMonitorPLUS (TCP + certificado A3)."""
from __future__ import annotations

from pathlib import Path

from .acbr_response import normalizar_nsu, parse_acbr_distribuicao_resposta
from .acbr_tcp import enviar_comando_acbr
from .base import DistDfeResultado, SefazProvider


class AcbrMonitorProvider:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        timeout_sec: int,
        output_dir: Path,
    ) -> None:
        self._host = host
        self._port = port
        self._timeout = timeout_sec
        self._output_dir = output_dir

    def distribuicao_por_ult_nsu(
        self,
        *,
        cnpj: str,
        uf: str,
        ultimo_nsu: str,
    ) -> DistDfeResultado:
        nsu = normalizar_nsu(ultimo_nsu)
        cmd = f'NFe.DistribuicaoDFePorUltNSU("{uf}", "{cnpj}", "{nsu}")'
        resposta = self._enviar_comando(cmd)
        return parse_acbr_distribuicao_resposta(
            resposta,
            output_dir=self._output_dir,
            ultimo_nsu_consulta=nsu,
        )

    def ping(self) -> str:
        return self._enviar_comando("ACBr.Status")

    def _enviar_comando(self, comando: str) -> str:
        return enviar_comando_acbr(
            host=self._host,
            port=self._port,
            comando=comando,
            timeout_sec=self._timeout,
        )
