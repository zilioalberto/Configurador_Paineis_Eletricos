"""Lista documentos fiscais importados com CNPJ divergente da ZFW (limpeza pós-importação)."""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.fiscal.services.documentos_fiscais_divergentes import (
    cnpj_empresa_fiscal,
    coletar_documentos_divergentes,
    exportar_linhas_divergentes_csv,
    formatar_rotulo_linha_divergente,
)


class Command(BaseCommand):
    help = (
        "Lista NF-es emitidas (emitente diferente da ZFW) e/ou recebidas (destinatario "
        "diferente da ZFW) ja gravadas no banco. Use para identificar importacoes "
        "incorretas antes de excluir pelo portal ou via API DELETE."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--tipo",
            choices=("emitidas", "recebidas", "ambos"),
            default="emitidas",
            help="Quais documentos listar (padrão: emitidas).",
        )
        parser.add_argument(
            "--limite",
            type=int,
            default=0,
            help="Máximo de registros por tipo (0 = sem limite).",
        )
        parser.add_argument(
            "--csv",
            action="store_true",
            help="Saída em CSV (stdout).",
        )

    def handle(self, *args, **options):
        cnpj_empresa = cnpj_empresa_fiscal()
        if len(cnpj_empresa) != 14:
            self.stderr.write(
                self.style.ERROR(
                    "FISCAL_EMPRESA_CNPJ não configurado ou inválido no servidor."
                )
            )
            raise SystemExit(1)

        tipo = options["tipo"]
        limite = max(0, int(options["limite"] or 0))
        listagem = coletar_documentos_divergentes(tipo, limite)

        if options["csv"]:
            exportar_linhas_divergentes_csv(listagem.linhas)
            return

        self._imprimir_texto(cnpj_empresa, tipo, limite, listagem)

    def _imprimir_texto(self, cnpj_empresa, tipo, limite, listagem) -> None:
        self.stdout.write(f"CNPJ empresa (ZFW): {cnpj_empresa}")
        if tipo in {"emitidas", "ambos"}:
            self.stdout.write(
                f"Emitidas com emitente divergente: {listagem.total_emitidas}"
            )
        if tipo in {"recebidas", "ambos"}:
            self.stdout.write(
                f"Recebidas com destinatário divergente: {listagem.total_recebidas}"
            )

        if not listagem.linhas:
            self.stdout.write(self.style.SUCCESS("Nenhum documento divergente encontrado."))
            return

        for row in listagem.linhas:
            self.stdout.write(formatar_rotulo_linha_divergente(row))

        if limite and (
            listagem.total_emitidas > limite or listagem.total_recebidas > limite
        ):
            self.stdout.write(
                self.style.WARNING(
                    f"Listagem limitada a {limite} registro(s) por tipo; "
                    "use --limite 0 para ver todos ou --csv para exportar."
                )
            )
