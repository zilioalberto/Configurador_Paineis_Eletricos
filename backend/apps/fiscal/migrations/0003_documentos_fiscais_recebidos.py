# Generated manually for ControleNSU, DocumentoFiscalRecebido, ItemDocumentoFiscal

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("fiscal", "0002_remove_itemfiscalproduto_chave_nfe"),
    ]

    operations = [
        migrations.CreateModel(
            name="ControleNSU",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("cnpj", models.CharField(max_length=14, unique=True)),
                ("ultimo_nsu", models.CharField(default="000000000000000", max_length=15)),
                ("max_nsu", models.CharField(blank=True, max_length=15, null=True)),
                ("ultimo_cstat", models.CharField(blank=True, max_length=10)),
                ("ultimo_motivo", models.CharField(blank=True, max_length=255)),
                ("bloqueado_ate", models.DateTimeField(blank=True, null=True)),
                ("ultima_consulta", models.DateTimeField(blank=True, null=True)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Controle NSU",
                "verbose_name_plural": "Controles NSU",
            },
        ),
        migrations.CreateModel(
            name="DocumentoFiscalRecebido",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("chave_acesso", models.CharField(max_length=44, unique=True)),
                ("nsu", models.CharField(blank=True, max_length=15, null=True)),
                ("cnpj_emitente", models.CharField(max_length=14)),
                ("nome_emitente", models.CharField(blank=True, max_length=255)),
                ("cnpj_destinatario", models.CharField(max_length=14)),
                ("nome_destinatario", models.CharField(blank=True, max_length=255)),
                ("numero", models.CharField(max_length=20)),
                ("serie", models.CharField(max_length=10)),
                ("data_emissao", models.DateTimeField(blank=True, null=True)),
                ("valor_total", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("natureza_operacao", models.CharField(blank=True, max_length=255)),
                (
                    "status_importacao",
                    models.CharField(
                        choices=[
                            ("RECEBIDA", "Recebida"),
                            ("PROCESSADA", "Processada"),
                            ("ERRO", "Erro"),
                            ("IGNORADA", "Ignorada"),
                        ],
                        default="RECEBIDA",
                        max_length=30,
                    ),
                ),
                (
                    "origem_importacao",
                    models.CharField(
                        choices=[
                            ("MANUAL", "Manual"),
                            ("PONTE_A3", "Ponte A3"),
                            ("API", "API"),
                            ("OUTRO", "Outro"),
                        ],
                        default="MANUAL",
                        max_length=30,
                    ),
                ),
                ("xml_original", models.TextField(blank=True)),
                ("criada_em", models.DateTimeField(auto_now_add=True)),
                ("atualizada_em", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Documento fiscal recebido",
                "verbose_name_plural": "Documentos fiscais recebidos",
                "ordering": ["-data_emissao", "-criada_em"],
            },
        ),
        migrations.CreateModel(
            name="ItemDocumentoFiscal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("numero_item", models.PositiveIntegerField()),
                ("codigo_fornecedor", models.CharField(blank=True, max_length=100)),
                ("descricao", models.CharField(max_length=500)),
                ("ncm", models.CharField(blank=True, max_length=20)),
                ("cfop", models.CharField(blank=True, max_length=10)),
                ("unidade", models.CharField(blank=True, max_length=20)),
                ("quantidade", models.DecimalField(decimal_places=4, max_digits=14)),
                ("valor_unitario", models.DecimalField(decimal_places=4, max_digits=14)),
                ("valor_total", models.DecimalField(decimal_places=2, max_digits=14)),
                ("importado_para_produto", models.BooleanField(default=False)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "documento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="itens",
                        to="fiscal.documentofiscalrecebido",
                    ),
                ),
            ],
            options={
                "verbose_name": "Item do documento fiscal",
                "verbose_name_plural": "Itens do documento fiscal",
                "ordering": ["numero_item"],
            },
        ),
        migrations.AddConstraint(
            model_name="itemdocumentofiscal",
            constraint=models.UniqueConstraint(
                fields=("documento", "numero_item"),
                name="fiscal_item_doc_numero_unico",
            ),
        ),
    ]
