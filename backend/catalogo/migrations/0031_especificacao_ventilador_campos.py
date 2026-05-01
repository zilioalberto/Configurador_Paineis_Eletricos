from decimal import Decimal

from django.db import migrations, models

from core.choices.produtos import (
    TipoMontagemVentiladorChoices,
    TipoVentiladorChoices,
)


def _backfill_vazao_m3_h(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoVentilador")
    for row in Model.objects.all():
        src = row.vazao_nominal_m3h
        val = src if src is not None else Decimal("0")
        Model.objects.filter(pk=row.pk).update(vazao_m3_h=val)


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0030_especificacao_trilho_din_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoventilador",
            name="tipo_ventilador",
            field=models.CharField(
                choices=TipoVentiladorChoices.choices,
                default=TipoVentiladorChoices.OUTRO,
                help_text="Tipo construtivo do ventilador/exaustor.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="vazao_m3_h",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Vazão de ar em m³/h.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="corrente_nominal_a",
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                help_text="Corrente nominal consumida pelo ventilador.",
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="potencia_w",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Potência elétrica consumida.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="frequencia_hz",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Frequência de alimentação, ex.: 50/60 Hz.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="tipo_montagem",
            field=models.CharField(
                blank=True,
                choices=TipoMontagemVentiladorChoices.choices,
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="nivel_ruido_db",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Nível de ruído em dB.",
                max_digits=5,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="grau_protecao_ip",
            field=models.CharField(
                blank=True,
                help_text="Grau de proteção, exemplo IP54.",
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="largura_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="altura_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="profundidade_mm",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="possui_filtro",
            field=models.BooleanField(
                default=False,
                help_text="Indica se o ventilador já possui filtro integrado.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaoventilador",
            name="observacoes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RunPython(_backfill_vazao_m3_h, _noop),
        migrations.RemoveField(
            model_name="especificacaoventilador",
            name="vazao_nominal_m3h",
        ),
        migrations.AlterField(
            model_name="especificacaoventilador",
            name="vazao_m3_h",
            field=models.DecimalField(
                decimal_places=2,
                help_text="Vazão de ar em m³/h.",
                max_digits=8,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoventilador",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                help_text="Tensão de alimentação do ventilador.",
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaoventilador",
            name="diametro_mm",
        ),
    ]
