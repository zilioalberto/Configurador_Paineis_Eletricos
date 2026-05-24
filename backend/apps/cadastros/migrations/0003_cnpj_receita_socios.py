import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0002_parceiro_comercial"),
    ]

    operations = [
        migrations.AddField(
            model_name="parceirocomercial",
            name="capital_social",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=18, null=True
            ),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="cnae_fiscal",
            field=models.CharField(blank=True, max_length=7),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="cnae_fiscal_descricao",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="consulta_receita_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Ultima consulta de CNPJ na Receita via Brasil API.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="data_inicio_atividade",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="natureza_juridica",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="situacao_cadastral",
            field=models.CharField(
                blank=True,
                help_text="Descricao da situacao na Receita Federal (ex.: ATIVA).",
                max_length=40,
            ),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="situacao_cadastral_codigo",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Codigo numerico da situacao cadastral na Receita.",
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="parceirocomercial",
            name="origem",
            field=models.CharField(
                choices=[
                    ("MANUAL", "Manual"),
                    ("NFE", "NF-e"),
                    ("IMPORTACAO", "Importacao"),
                    ("BRASILAPI", "Consulta Receita (Brasil API)"),
                ],
                default="MANUAL",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="SocioParceiro",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("ordem", models.PositiveSmallIntegerField(default=0)),
                ("nome", models.CharField(max_length=255)),
                ("qualificacao", models.CharField(blank=True, max_length=120)),
                ("data_entrada", models.DateField(blank=True, null=True)),
                ("faixa_etaria", models.CharField(blank=True, max_length=80)),
                (
                    "parceiro",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="socios",
                        to="cadastros.parceirocomercial",
                    ),
                ),
            ],
            options={
                "verbose_name": "Socio do parceiro",
                "verbose_name_plural": "Socios do parceiro",
                "db_table": "cadastros_parceiro_socio",
                "ordering": ("parceiro_id", "ordem", "nome"),
            },
        ),
    ]
