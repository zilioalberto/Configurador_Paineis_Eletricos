"""Verificação de pré-requisitos antes do primeiro sync em produção."""
from __future__ import annotations

import socket
from dataclasses import dataclass
from pathlib import Path

import httpx

from .api_client import FiscalApiClient
from .config import PonteConfig, load_env_file


@dataclass
class CheckResult:
    nome: str
    ok: bool
    detalhe: str


def _check_env_file() -> CheckResult:
    path = load_env_file()
    if path:
        return CheckResult("Arquivo .env", True, str(path))
    exemplo = Path(__file__).resolve().parent.parent / ".env.example"
    return CheckResult(
        "Arquivo .env",
        False,
        f"Copie {exemplo.name} para .env em tools/fiscal_ponte/",
    )


def _check_config(config: PonteConfig) -> list[CheckResult]:
    results: list[CheckResult] = []
    try:
        config.validate()
        results.append(CheckResult("Configuração", True, "CNPJ, token e UF válidos"))
    except ValueError as exc:
        results.append(CheckResult("Configuração", False, str(exc)))
    return results


def _check_api(config: PonteConfig) -> CheckResult:
    try:
        api = FiscalApiClient(config.api_base_url, config.agent_token, timeout_sec=15.0)
        controle = api.get_controle_nsu(config.cnpj)
        return CheckResult(
            "API central",
            True,
            f"NSU remoto ultNSU={controle.ultimo_nsu} cStat={controle.ultimo_cstat or '—'}",
        )
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            return CheckResult(
                "API central",
                False,
                "Token recusado — confira FISCAL_AGENT_TOKEN no servidor e na ponte",
            )
        return CheckResult("API central", False, f"HTTP {exc.response.status_code}")
    except Exception as exc:  # noqa: BLE001
        return CheckResult("API central", False, str(exc))


def _check_acbr_tcp(config: PonteConfig) -> CheckResult:
    try:
        with socket.create_connection(
            (config.acbr_host, config.acbr_port),
            timeout=5,
        ):
            return CheckResult(
                "ACBrMonitor TCP",
                True,
                f"{config.acbr_host}:{config.acbr_port} acessível",
            )
    except OSError as exc:
        return CheckResult(
            "ACBrMonitor TCP",
            False,
            f"Não conectou em {config.acbr_host}:{config.acbr_port}: {exc}",
        )


def _check_acbr_output(config: PonteConfig) -> CheckResult:
    if not config.acbr_output_dir:
        return CheckResult("Pasta ACBr", False, "FISCAL_PONTE_ACBR_OUTPUT_DIR não definida")
    if config.acbr_output_dir.is_dir():
        return CheckResult("Pasta ACBr", True, str(config.acbr_output_dir))
    return CheckResult("Pasta ACBr", False, f"Pasta inexistente: {config.acbr_output_dir}")


def _check_folder(config: PonteConfig) -> CheckResult:
    if not config.folder_xml:
        return CheckResult("Pasta XML", False, "FISCAL_PONTE_FOLDER_XML não definida")
    if not config.folder_xml.is_dir():
        return CheckResult("Pasta XML", False, f"Pasta inexistente: {config.folder_xml}")
    qtd = len(list(config.folder_xml.glob("*.xml")))
    return CheckResult("Pasta XML", True, f"{config.folder_xml} ({qtd} ficheiro(s) .xml)")


def executar_setup_check(
    config: PonteConfig | None = None,
    *,
    verificar_env: bool = True,
) -> list[CheckResult]:
    config = config or PonteConfig.from_env()
    checks: list[CheckResult] = []
    if verificar_env:
        checks.append(_check_env_file())
    checks.extend(_check_config(config))
    if any(c.nome == "Configuração" and not c.ok for c in checks):
        return checks
    checks.append(_check_api(config))
    if config.sefaz_provider == "acbr":
        checks.append(_check_acbr_tcp(config))
        checks.append(_check_acbr_output(config))
    elif config.sefaz_provider == "folder":
        checks.append(_check_folder(config))
    return checks


def todos_ok(checks: list[CheckResult]) -> bool:
    return all(c.ok for c in checks)
