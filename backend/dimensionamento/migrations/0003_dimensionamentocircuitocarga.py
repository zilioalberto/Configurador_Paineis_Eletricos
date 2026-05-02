# Generated manually

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cargas", "0012_rele_interface_valvula_resistencia"),
        ("dimensionamento", "0002_corrente_estimada_fonte_24vcc"),
        ("projetos", "0013_projeto_responsavel"),
    ]

    operations = [
        migrations.CreateModel(
            name="DimensionamentoCircuitoCarga",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "tipo_carga",
                    models.CharField(
                        choices=[
                            ("MOTOR", "Motor"),
                            ("VALVULA", "Válvula"),
                            ("RESISTENCIA", "Resistência"),
                            ("SENSOR", "Sensor"),
                            ("TRANSDUTOR", "Transdutor"),
                            ("TRANSMISSOR", "Transmissor"),
                        ],
                        db_index=True,
                        max_length=30,
                    ),
                ),
                (
                    "classificacao_circuito",
                    models.CharField(
                        choices=[
                            ("POTENCIA", "Potência"),
                            ("COMANDO", "Comando"),
                            ("SINAL", "Sinal"),
                        ],
                        default="POTENCIA",
                        max_length=20,
                    ),
                ),
                (
                    "corrente_calculada_a",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Corrente por unidade ou do elemento (conforme especificação da carga).",
                        max_digits=12,
                        null=True,
                    ),
                ),
                (
                    "corrente_projeto_a",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Corrente após aplicar fator de demanda do projeto (e quantidade, quando aplicável).",
                        max_digits=12,
                        null=True,
                    ),
                ),
                (
                    "quantidade_condutores_fase",
                    models.PositiveSmallIntegerField(
                        default=0,
                        help_text="Condutores de fase/potência ou, em comando/sinal, uso conforme regra documentada.",
                    ),
                ),
                (
                    "quantidade_condutores_comando",
                    models.PositiveSmallIntegerField(default=0),
                ),
                (
                    "quantidade_condutores_sinal",
                    models.PositiveSmallIntegerField(default=0),
                ),
                ("possui_neutro", models.BooleanField(default=False)),
                ("possui_pe", models.BooleanField(default=False)),
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
                    "carga",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dimensionamento_circuito",
                        to="cargas.carga",
                    ),
                ),
                (
                    "projeto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dimensionamentos_circuito_carga",
                        to="projetos.projeto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Dimensionamento de circuito (carga)",
                "verbose_name_plural": "Dimensionamentos de circuitos (cargas)",
                "ordering": ["projeto", "carga__tag"],
            },
        ),
    ]
