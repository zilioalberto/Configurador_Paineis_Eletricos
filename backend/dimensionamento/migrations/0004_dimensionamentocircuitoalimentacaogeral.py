# Generated manually

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dimensionamento", "0003_dimensionamentocircuitocarga"),
        ("projetos", "0013_projeto_responsavel"),
    ]

    operations = [
        migrations.CreateModel(
            name="DimensionamentoCircuitoAlimentacaoGeral",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "corrente_total_painel_a",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Referência: ResumoDimensionamento.corrente_total_painel_a no momento do cálculo.",
                        max_digits=12,
                    ),
                ),
                (
                    "tipo_corrente",
                    models.CharField(
                        choices=[("CA", "CA"), ("CC", "CC")],
                        max_length=2,
                    ),
                ),
                (
                    "numero_fases",
                    models.IntegerField(
                        blank=True,
                        help_text="Cópia de projetos_projeto.numero_fases (CA).",
                        null=True,
                    ),
                ),
                ("possui_neutro", models.BooleanField()),
                (
                    "possui_terra",
                    models.BooleanField(
                        help_text="Alimentação com condutor de proteção (PE/terra)."
                    ),
                ),
                (
                    "quantidade_condutores_fase",
                    models.PositiveSmallIntegerField(
                        default=0,
                        help_text="Condutores de fase (ou pólos ativos em CC: ex. 2).",
                    ),
                ),
                (
                    "quantidade_condutores_neutro",
                    models.PositiveSmallIntegerField(
                        default=0,
                        help_text="0 se não houver neutro; 1 se houver condutor N.",
                    ),
                ),
                (
                    "secao_condutor_fase_mm2",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                (
                    "secao_condutor_neutro_mm2",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                (
                    "secao_condutor_pe_mm2",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=8, null=True
                    ),
                ),
                ("observacoes", models.TextField(blank=True)),
                ("memoria_calculo", models.TextField(blank=True)),
                (
                    "projeto",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dimensionamento_alimentacao_geral",
                        to="projetos.projeto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Dimensionamento — alimentação geral do painel",
                "verbose_name_plural": "Dimensionamentos — alimentação geral do painel",
            },
        ),
    ]
