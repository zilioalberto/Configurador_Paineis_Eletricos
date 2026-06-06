"""CLI da ponte fiscal."""
from __future__ import annotations

import argparse
import logging
import sys

from .api_client import FiscalApiClient
from .config import PonteConfig
from .sefaz.factory import build_sefaz_provider
from .homolog import executar_homolog
from .manifestacao_worker import processar_manifestacoes_pendentes
from .logging_setup import configurar_logging
from .service_loop import executar_servico
from .setup_check import executar_setup_check, todos_ok
from .sync_cycle import executar_ciclo_sincronizacao


def _setup_logging(verbose: bool) -> None:
    path = configurar_logging(verbose=verbose)
    if path:
        print(f"Log: {path}")


def cmd_sync(args: argparse.Namespace) -> int:
    config = PonteConfig.from_env()
    result = executar_ciclo_sincronizacao(config, dry_run=args.dry_run)
    logging.getLogger(__name__).info(result.resumo_log())
    return 0 if result.sucesso else 1


def cmd_ping_api(_: argparse.Namespace) -> int:
    config = PonteConfig.from_env()
    config.validate()
    api = FiscalApiClient(config.api_base_url, config.agent_token)
    controle = api.get_controle_nsu(config.cnpj)
    print(
        f"OK API — CNPJ {controle.cnpj} ultNSU={controle.ultimo_nsu} "
        f"cStat={controle.ultimo_cstat or '—'}"
    )
    return 0


def cmd_setup_check(_: argparse.Namespace) -> int:
    checks = executar_setup_check()
    exit_code = 0
    for item in checks:
        status = "OK" if item.ok else "FALHA"
        print(f"[{status}] {item.nome}: {item.detalhe}")
        if not item.ok:
            exit_code = 1
    if exit_code == 0:
        print("\nPronto para fiscal-ponte sync.")
    else:
        print("\nCorrija os itens acima antes do sync em produção.")
    return exit_code


def cmd_manifestar_pendentes(_: argparse.Namespace) -> int:
    config = PonteConfig.from_env()
    result = processar_manifestacoes_pendentes(config)
    print(
        f"Manifestações: processadas={result.processadas} "
        f"sucesso={result.sucesso} erros={result.erros}"
    )
    for d in result.detalhes:
        print(f"  - {d}")
    return 0 if result.erros == 0 else 1


def cmd_run_service(args: argparse.Namespace) -> int:
    config = PonteConfig.from_env()
    config.validate()
    intervalo = args.interval_min or config.sync_interval_min
    return executar_servico(config, intervalo_min=intervalo)


def cmd_homolog(_: argparse.Namespace) -> int:
    result = executar_homolog()
    logging.getLogger(__name__).info(result.resumo_log())
    print(result.resumo_log())
    return 0 if result.sucesso else 1


def cmd_ping_acbr(_: argparse.Namespace) -> int:
    config = PonteConfig.from_env()
    if config.sefaz_provider != "acbr":
        print("FISCAL_PONTE_SEFAZ_PROVIDER deve ser 'acbr' para este comando.", file=sys.stderr)
        return 2
    config.validate()
    provider = build_sefaz_provider(config)
    from .sefaz.acbr_monitor import AcbrMonitorProvider

    if not isinstance(provider, AcbrMonitorProvider):
        print("Provedor ACBr não disponível.", file=sys.stderr)
        return 2
    resposta = provider.ping()
    print(resposta[:2000])
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="fiscal_ponte",
        description="Ponte fiscal ZFW — certificado A3 local + API central",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    sync = sub.add_parser("sync", help="Executa ciclo DistDFe → API")
    sync.add_argument(
        "--dry-run",
        action="store_true",
        help="Valida config e NSU remoto sem consultar SEFAZ",
    )
    sync.set_defaults(func=cmd_sync)

    ping_api = sub.add_parser("ping-api", help="Testa token e GET /fiscal/nsu/{cnpj}/")
    ping_api.set_defaults(func=cmd_ping_api)

    ping_acbr = sub.add_parser("ping-acbr", help="Testa TCP com ACBrMonitor (ACBr.Status)")
    ping_acbr.set_defaults(func=cmd_ping_acbr)

    setup = sub.add_parser("setup-check", help="Valida .env, API e ACBr/pasta")
    setup.set_defaults(func=cmd_setup_check)

    homolog = sub.add_parser(
        "homolog",
        help="Envia XML de homolog/fixtures via modo folder (backend deve estar no ar)",
    )
    homolog.set_defaults(func=cmd_homolog)

    man = sub.add_parser(
        "manifestar-pendentes",
        help="Envia manifestações pendentes à SEFAZ (ACBr)",
    )
    man.set_defaults(func=cmd_manifestar_pendentes)

    run_svc = sub.add_parser(
        "run-service",
        help="Loop contínuo de sync (serviço Windows / NSSM)",
    )
    run_svc.add_argument(
        "--interval-min",
        type=int,
        default=None,
        help="Intervalo entre ciclos (default: FISCAL_PONTE_SYNC_INTERVAL_MIN)",
    )
    run_svc.set_defaults(func=cmd_run_service)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    _setup_logging(args.verbose)
    return int(args.func(args))
