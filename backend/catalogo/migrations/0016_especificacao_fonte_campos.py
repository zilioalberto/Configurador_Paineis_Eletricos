from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations, models

_TENSAO_INTEGER_CHOICES = [
    (12, "12 V"),
    (24, "24 V"),
    (48, "48 V"),
    (90, "90 V"),
    (110, "110 V"),
    (127, "127 V"),
    (220, "220 V"),
    (380, "380 V"),
    (440, "440 V"),
]

_TIPO_CORRENTE = [
    ("CA", "Corrente Alternada"),
    ("CC", "Corrente Contínua"),
]

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
]


def _fonte_preencher_corrente_saida(apps, schema_editor):
    Fonte = apps.get_model("catalogo", "EspecificacaoFonte")
    for row in Fonte.objects.all():
        if row.corrente_saida_a is not None:
            continue
        p = row.potencia_saida_w
        v = row.tensao_saida_v
        if p is not None and v:
            c = (Decimal(p) / Decimal(v)).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
            if c <= 0:
                c = Decimal("5.00")
        else:
            c = Decimal("5.00")
        Fonte.objects.filter(pk=row.pk).update(corrente_saida_a=c)


def _fonte_preencher_corrente_saida_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0015_especificacao_filtro_ar_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaofonte",
            name="tensao_entrada_v",
            field=models.IntegerField(
                choices=_TENSAO_INTEGER_CHOICES,
                default=220,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="tipo_corrente_entrada",
            field=models.CharField(
                choices=_TIPO_CORRENTE,
                default="CA",
                max_length=2,
            ),
        ),
        migrations.RenameField(
            model_name="especificacaofonte",
            old_name="tipo_saida",
            new_name="tipo_corrente_saida",
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="numero_saidas",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="rendimento_percentual",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=5,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="ajuste_tensao_saida",
            field=models.BooleanField(
                default=False,
                help_text="Permite ajuste fino da tensão de saída.",
            ),
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="protecao_curto",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="protecao_sobrecarga",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="protecao_sobretensao",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaofonte",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="TRILHO_DIN",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            _fonte_preencher_corrente_saida,
            _fonte_preencher_corrente_saida_reverse,
        ),
        migrations.AlterField(
            model_name="especificacaofonte",
            name="corrente_saida_a",
            field=models.DecimalField(decimal_places=2, max_digits=8),
        ),
    ]
