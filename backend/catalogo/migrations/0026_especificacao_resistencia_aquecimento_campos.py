from django.db import migrations, models

from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    TipoMontagemResistenciaChoices,
    TipoResistenciaAquecimentoChoices,
)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0025_especificacao_rele_interface_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="tipo_resistencia",
            field=models.CharField(
                choices=TipoResistenciaAquecimentoChoices.choices,
                default=TipoResistenciaAquecimentoChoices.CONVENCIONAL,
                help_text="Tipo construtivo da resistência de aquecimento.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="possui_ventilacao",
            field=models.BooleanField(
                default=False,
                help_text="Indica se possui ventilador integrado.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="tipo_montagem",
            field=models.CharField(
                blank=True,
                choices=TipoMontagemResistenciaChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="corrente_nominal_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                help_text="Corrente nominal consumida pela resistência.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="largura_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="altura_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="profundidade_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="grau_protecao_ip",
            field=models.CharField(
                blank=True,
                help_text="Grau de proteção, por exemplo IP20.",
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="faixa_temperatura_operacao_min_c",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="faixa_temperatura_operacao_max_c",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoresistenciaaquecimento",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RenameField(
            model_name="especificacaoresistenciaaquecimento",
            old_name="potencia_nominal_w",
            new_name="potencia_w",
        ),
        migrations.AlterField(
            model_name="especificacaoresistenciaaquecimento",
            name="potencia_w",
            field=models.DecimalField(
                decimal_places=2,
                help_text="Potência térmica da resistência em watts.",
                max_digits=8,
            ),
        ),
        migrations.RenameField(
            model_name="especificacaoresistenciaaquecimento",
            old_name="tensao_nominal_v",
            new_name="tensao_alimentacao_v",
        ),
        migrations.AlterField(
            model_name="especificacaoresistenciaaquecimento",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                choices=TensaoChoices.choices,
                help_text="Tensão de alimentação da resistência.",
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaoresistenciaaquecimento",
            name="resistencia_ohm",
        ),
    ]
