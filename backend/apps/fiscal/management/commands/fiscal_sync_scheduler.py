"""Agendador em loop da sincronização SEFAZ (DistDFe) — roda em processo dedicado.

Executa ``executar_sincronizacao_nsu`` periodicamente (padrão: a cada 1 hora,
``FISCAL_SYNC_INTERVAL_SECONDS``), respeitando o bloqueio temporário imposto pela
SEFAZ (cStat 137/656). Pensado para rodar como serviço próprio (1 instância) para
não duplicar consultas — consultas em excesso geram cStat 656 (Consumo Indevido).
"""
import logging
import time

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.fiscal.services.sefaz import executar_sincronizacao_nsu, get_sefaz_config

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Loop de sincronização automática SEFAZ (DistDFe) a cada intervalo configurável."

    def add_arguments(self, parser):
        parser.add_argument(
            "--intervalo",
            type=int,
            default=None,
            help="Segundos entre execuções (padrão: FISCAL_SYNC_INTERVAL_SECONDS ou 3600).",
        )
        parser.add_argument(
            "--initial-delay",
            type=int,
            default=15,
            help="Atraso (s) antes da primeira execução, para aguardar migrações/serviços.",
        )
        parser.add_argument(
            "--once",
            action="store_true",
            help="Executa uma única vez e encerra (útil para cron externo).",
        )

    def _intervalo(self, options) -> int:
        intervalo = options["intervalo"]
        if intervalo is None:
            intervalo = int(getattr(settings, "FISCAL_SYNC_INTERVAL_SECONDS", 3600) or 3600)
        return max(60, intervalo)

    def _executar_uma_vez(self) -> None:
        try:
            config = get_sefaz_config()
            config.validate()
        except (ValueError, FileNotFoundError) as exc:
            self.stderr.write(self.style.WARNING(f"[scheduler] configuração inválida: {exc}"))
            return
        try:
            resultado = executar_sincronizacao_nsu(config=config)
        except Exception as exc:  # noqa: BLE001
            logger.exception("[scheduler] falha na sincronização")
            self.stderr.write(self.style.ERROR(f"[scheduler] erro: {exc}"))
            return
        self.stdout.write(
            f"[scheduler] {resultado.mensagem} | novos={resultado.documentos_novos} "
            f"resumos_novos={resultado.resumos_novos} ciencias={resultado.ciencias_solicitadas} "
            f"manifest={resultado.manifestacoes_processadas} cStat={resultado.ultimo_cstat} "
            f"ultNSU={resultado.ultimo_nsu}"
        )

    def handle(self, *args, **options):
        intervalo = self._intervalo(options)
        initial_delay = max(0, options["initial_delay"])

        if options["once"]:
            self._executar_uma_vez()
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"[scheduler] iniciado (intervalo={intervalo}s, delay inicial={initial_delay}s)."
            )
        )
        if initial_delay:
            time.sleep(initial_delay)

        while True:
            self._executar_uma_vez()
            time.sleep(intervalo)
