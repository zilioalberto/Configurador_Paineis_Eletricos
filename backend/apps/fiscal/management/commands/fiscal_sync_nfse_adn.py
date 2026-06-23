"""Sincroniza NFS-es recebidas no ADN (distribuição DFe)."""
from django.core.management.base import BaseCommand, CommandError

from apps.fiscal.services.nfse_adn import (
    executar_sincronizacao_nfse_adn,
    get_nfse_adn_config,
    redefinir_nsu_nfse_adn,
)


class Command(BaseCommand):
    help = "Consulta ADN NFS-e Nacional e importa NFS-es recebidas (tomador = empresa)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Valida configuração sem consultar ADN.",
        )
        parser.add_argument(
            "--reset-nsu",
            action="store_true",
            help="Zera o NSU consumido (volta para 0) antes de sincronizar — ressincroniza do início.",
        )
        parser.add_argument(
            "--nsu",
            type=str,
            default=None,
            help="Define o NSU inicial (ex.: 100) antes de sincronizar. Tem prioridade sobre --reset-nsu.",
        )

    def handle(self, *args, **options):
        config = get_nfse_adn_config()

        reset_nsu = options.get("reset_nsu")
        nsu_arg = options.get("nsu")
        if reset_nsu or nsu_arg is not None:
            novo_nsu = nsu_arg if nsu_arg is not None else "0"
            try:
                controle = redefinir_nsu_nfse_adn(config.cnpj, novo_nsu=novo_nsu)
            except ValueError as exc:
                raise CommandError(str(exc)) from exc
            self.stdout.write(
                f"NSU redefinido para {controle.ultimo_nsu} (cnpj={controle.cnpj})."
            )

        resultado = executar_sincronizacao_nfse_adn(
            config=config,
            dry_run=options["dry_run"],
        )
        self.stdout.write(
            f"ADN status={resultado.ultimo_status} ultNSU={resultado.ultimo_nsu} "
            f"novos={resultado.documentos_novos} importados={resultado.documentos_importados}"
        )
        for erro in resultado.erros_importacao:
            self.stderr.write(erro)
        if not resultado.sucesso:
            self.stderr.write(resultado.mensagem)
            raise SystemExit(1)
