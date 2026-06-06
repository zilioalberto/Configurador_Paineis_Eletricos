"""Cliente HTTP da API fiscal central (Bearer agente)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx

from .http_retry import chamar_com_retry

@dataclass
class ControleNsuRemoto:
    cnpj: str
    ultimo_nsu: str
    max_nsu: str | None
    ultimo_cstat: str
    ultimo_motivo: str
    bloqueado_ate: datetime | None
    ultima_consulta: datetime | None


@dataclass
class ImportarXmlResultado:
    created: bool
    message: str
    documento_id: int
    chave_acesso: str


class FiscalApiClient:
    def __init__(
        self,
        base_url: str,
        agent_token: str,
        timeout_sec: float = 60.0,
        *,
        retry_max: int = 3,
        retry_base_sec: float = 2.0,
    ) -> None:
        self._base = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {agent_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self._timeout = timeout_sec
        self._retry_max = retry_max
        self._retry_base_sec = retry_base_sec

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self._base,
            headers=self._headers,
            timeout=self._timeout,
        )

    def get_controle_nsu(self, cnpj: str) -> ControleNsuRemoto:
        digits = "".join(ch for ch in cnpj if ch.isdigit())

        def _call() -> ControleNsuRemoto:
            with self._client() as client:
                resp = client.get(f"/fiscal/nsu/{digits}/")
                resp.raise_for_status()
                return _parse_controle(resp.json())

        return chamar_com_retry(
            _call,
            max_tentativas=self._retry_max,
            base_delay_sec=self._retry_base_sec,
            operacao_nome="GET nsu",
        )

    def patch_controle_nsu(self, cnpj: str, payload: dict[str, Any]) -> ControleNsuRemoto:
        digits = "".join(ch for ch in cnpj if ch.isdigit())

        def _call() -> ControleNsuRemoto:
            with self._client() as client:
                resp = client.patch(f"/fiscal/nsu/{digits}/", json=payload)
                resp.raise_for_status()
                return _parse_controle(resp.json())

        return chamar_com_retry(
            _call,
            max_tentativas=self._retry_max,
            base_delay_sec=self._retry_base_sec,
            operacao_nome="PATCH nsu",
        )

    def importar_xml(
        self,
        xml: str,
        *,
        nsu: str | None = None,
        origem_importacao: str = "PONTE_A3",
    ) -> ImportarXmlResultado:
        body: dict[str, str] = {"xml": xml, "origem_importacao": origem_importacao}
        if nsu:
            body["nsu"] = "".join(ch for ch in nsu if ch.isdigit())

        def _call() -> ImportarXmlResultado:
            with self._client() as client:
                resp = client.post("/fiscal/nfes/importar-xml/", json=body)
                if resp.status_code == 400:
                    detail = resp.json().get("detail", resp.text)
                    raise ValueError(str(detail))
                resp.raise_for_status()
                data = resp.json()
                return ImportarXmlResultado(
                    created=bool(data.get("created")),
                    message=str(data.get("message", "")),
                    documento_id=int(data["documento_id"]),
                    chave_acesso=str(data.get("chave_acesso", "")),
                )

        return chamar_com_retry(
            _call,
            max_tentativas=self._retry_max,
            base_delay_sec=self._retry_base_sec,
            operacao_nome="POST importar-xml",
        )

    def listar_manifestacoes_pendentes(self, limit: int = 50) -> list[dict]:
        def _call() -> list[dict]:
            with self._client() as client:
                resp = client.get(
                    "/fiscal/nfes/manifestacoes-pendentes/",
                    params={"limit": limit},
                )
                resp.raise_for_status()
                return list(resp.json())

        return chamar_com_retry(
            _call,
            max_tentativas=self._retry_max,
            base_delay_sec=self._retry_base_sec,
            operacao_nome="GET manifestacoes-pendentes",
        )

    def registrar_manifestacao(
        self,
        documento_id: int,
        *,
        sucesso: bool,
        protocolo: str = "",
        cstat: str = "",
        motivo: str = "",
        mensagem_erro: str = "",
    ) -> dict:
        body = {
            "sucesso": sucesso,
            "protocolo": protocolo,
            "cstat": cstat,
            "motivo": motivo,
            "mensagem_erro": mensagem_erro,
        }

        def _call() -> dict:
            with self._client() as client:
                resp = client.post(
                    f"/fiscal/nfes/{documento_id}/registrar-manifestacao/",
                    json=body,
                )
                if resp.status_code == 400:
                    detail = resp.json().get("detail", resp.text)
                    raise ValueError(str(detail))
                resp.raise_for_status()
                return dict(resp.json())

        return chamar_com_retry(
            _call,
            max_tentativas=self._retry_max,
            base_delay_sec=self._retry_base_sec,
            operacao_nome="POST registrar-manifestacao",
        )


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _parse_controle(data: dict[str, Any]) -> ControleNsuRemoto:
    return ControleNsuRemoto(
        cnpj=str(data.get("cnpj", "")),
        ultimo_nsu=str(data.get("ultimo_nsu", "")),
        max_nsu=data.get("max_nsu") or None,
        ultimo_cstat=str(data.get("ultimo_cstat", "")),
        ultimo_motivo=str(data.get("ultimo_motivo", "")),
        bloqueado_ate=_parse_iso(data.get("bloqueado_ate")),
        ultima_consulta=_parse_iso(data.get("ultima_consulta")),
    )
