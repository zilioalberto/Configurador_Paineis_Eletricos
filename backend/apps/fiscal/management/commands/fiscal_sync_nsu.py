"""Sincroniza NF-es recebidas na SEFAZ (DistDFe) usando certificado A1 no servidor."""
from django.core.management.base import BaseCommand

from apps.fiscal.services.sefaz import executar_sincronizacao_nsu, get_sefaz_config


class Command(BaseCommand):
    help = (
        "Consulta a SEFAZ (Distribuição DFe por NSU), importa XMLs contra o CNPJ "
        "e processa manifestações pendentes. Requer FISCAL_CERT_PATH (A1) no servidor."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Valida configuração sem consultar a SEFAZ.",
        )
        parser.add_argument(
            "--sem-manifestacao",
            action="store_true",
            help="Não processa manifestações pendentes ao final.",
        )

    def handle(self, *args, **options):
        config = get_sefaz_config()
        try:
            config.validate()
        except (ValueError, FileNotFoundError) as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            raise SystemExit(1) from exc

        resultado = executar_sincronizacao_nsu(
            config=config,
            dry_run=options["dry_run"],
            processar_manifestacoes=not options["sem_manifestacao"],
        )

        self.stdout.write(
            f"{resultado.mensagem} | ciclos={resultado.ciclos_executados} "
            f"novos={resultado.documentos_novos} dup={resultado.documentos_duplicados} "
            f"cStat={resultado.ultimo_cstat} ultNSU={resultado.ultimo_nsu} "
            f"maxNSU={resultado.max_nsu}"
        )
        for erro in resultado.erros_importacao:
            self.stderr.write(self.style.WARNING(erro))

        if not resultado.sucesso:
            raise SystemExit(1)
