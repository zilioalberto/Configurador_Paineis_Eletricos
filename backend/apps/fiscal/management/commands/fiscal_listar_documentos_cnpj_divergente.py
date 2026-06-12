"""Lista documentos fiscais importados com CNPJ divergente da ZFW (limpeza pós-importação)."""
from __future__ import annotations

import csv
import sys

from django.core.management.base import BaseCommand

from apps.fiscal.services.documentos_fiscais_divergentes import (
    cnpj_empresa_fiscal,
    queryset_emitidas_emitente_divergente,
    queryset_recebidas_destinatario_divergente,
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
        usar_csv = options["csv"]

        linhas: list[dict[str, str]] = []
        total_emitidas = 0
        total_recebidas = 0

        if tipo in {"emitidas", "ambos"}:
            qs = queryset_emitidas_emitente_divergente()
            total_emitidas = qs.count()
            docs = qs[:limite] if limite else qs
            for doc in docs:
                linhas.append(
                    {
                        "tipo": "EMITIDA",
                        "public_id": str(doc.public_id),
                        "id": str(doc.id),
                        "numero": doc.numero,
                        "serie": doc.serie,
                        "data_emissao": doc.data_emissao.isoformat() if doc.data_emissao else "",
                        "valor_total": str(doc.valor_total),
                        "cnpj_participante": doc.cnpj_emitente,
                        "nome_participante": doc.nome_emitente,
                        "cnpj_contraparte": doc.cnpj_destinatario,
                        "nome_contraparte": doc.nome_destinatario,
                        "origem_importacao": doc.origem_importacao,
                    }
                )

        if tipo in {"recebidas", "ambos"}:
            qs = queryset_recebidas_destinatario_divergente()
            total_recebidas = qs.count()
            docs = qs[:limite] if limite else qs
            for doc in docs:
                linhas.append(
                    {
                        "tipo": "RECEBIDA",
                        "public_id": "",
                        "id": str(doc.id),
                        "numero": doc.numero,
                        "serie": doc.serie,
                        "data_emissao": doc.data_emissao.isoformat() if doc.data_emissao else "",
                        "valor_total": str(doc.valor_total),
                        "cnpj_participante": doc.cnpj_destinatario,
                        "nome_participante": doc.nome_destinatario,
                        "cnpj_contraparte": doc.cnpj_emitente,
                        "nome_contraparte": doc.nome_emitente,
                        "origem_importacao": doc.origem_importacao,
                    }
                )

        if usar_csv:
            writer = csv.DictWriter(
                sys.stdout,
                fieldnames=[
                    "tipo",
                    "public_id",
                    "id",
                    "numero",
                    "serie",
                    "data_emissao",
                    "valor_total",
                    "cnpj_participante",
                    "nome_participante",
                    "cnpj_contraparte",
                    "nome_contraparte",
                    "origem_importacao",
                ],
            )
            writer.writeheader()
            writer.writerows(linhas)
            return

        self.stdout.write(f"CNPJ empresa (ZFW): {cnpj_empresa}")
        if tipo in {"emitidas", "ambos"}:
            self.stdout.write(
                f"Emitidas com emitente divergente: {total_emitidas}"
            )
        if tipo in {"recebidas", "ambos"}:
            self.stdout.write(
                f"Recebidas com destinatário divergente: {total_recebidas}"
            )

        if not linhas:
            self.stdout.write(self.style.SUCCESS("Nenhum documento divergente encontrado."))
            return

        for row in linhas:
            rotulo = (
                f"[{row['tipo']}] nº {row['numero']}/{row['serie']} "
                f"— participante {row['nome_participante']} ({row['cnpj_participante']}) "
                f"— valor {row['valor_total']}"
            )
            if row["tipo"] == "EMITIDA":
                rotulo += f" — public_id={row['public_id']}"
            else:
                rotulo += f" — id={row['id']}"
            self.stdout.write(rotulo)

        if limite and (total_emitidas > limite or total_recebidas > limite):
            self.stdout.write(
                self.style.WARNING(
                    f"Listagem limitada a {limite} registro(s) por tipo; "
                    "use --limite 0 para ver todos ou --csv para exportar."
                )
            )
