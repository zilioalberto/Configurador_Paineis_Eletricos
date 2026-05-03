from decimal import Decimal

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

_CURVA = [("B", "Curva B"), ("C", "Curva C"), ("D", "Curva D")]
_POLOS = [("1P", "1P"), ("2P", "2P"), ("3P", "3P"), ("4P", "4P")]
_TIPO_CORRENTE = [("CA", "Corrente Alternada"), ("CC", "Corrente Contínua")]
_FREQ = [(50, "50 Hz"), (60, "60 Hz")]
_PADRAO = [("IEC", "IEC"), ("UL", "UL")]
_TIPO_PROT = [("TERMOMAGNETICO", "Termomagnético")]


def _preencher_mini_disjuntor_a_partir_campos_legados(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoMiniDisjuntor")
    map_polos = {1: "1P", 2: "2P", 3: "3P", 4: "4P"}
    for obj in Spec.objects.all():
        max_a = getattr(obj, "faixa_ajuste_max_a", None)
        min_a = getattr(obj, "faixa_ajuste_min_a", None)
        if max_a is not None:
            obj.corrente_nominal_a = max_a
        elif min_a is not None:
            obj.corrente_nominal_a = min_a
        polos = getattr(obj, "polos", None)
        if polos is not None:
            try:
                obj.numero_polos = map_polos.get(int(polos), "1P")
            except (TypeError, ValueError):
                obj.numero_polos = "1P"
        obj.save(
            update_fields=[
                "corrente_nominal_a",
                "numero_polos",
            ]
        )


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0004_especificacoes_categorias_complemento"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="capacidade_interrupcao_ka",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("6"),
                help_text="Capacidade de interrupção em kA (ex.: 3, 6, 10).",
                max_digits=6,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="corrente_nominal_a",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("10"),
                help_text="Corrente nominal do disjuntor (ex.: 2, 6, 10, 16, 20, 32 A).",
                max_digits=8,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="curva_disparo",
            field=models.CharField(
                choices=_CURVA,
                default="C",
                max_length=1,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="frequencia_hz",
            field=models.IntegerField(choices=_FREQ, default=60),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="numero_polos",
            field=models.CharField(
                choices=_POLOS,
                default="1P",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="padrao",
            field=models.CharField(
                blank=True,
                choices=_PADRAO,
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="tensao_nominal_v",
            field=models.IntegerField(choices=_TENSAO_INTEGER_CHOICES, default=220),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="tipo_corrente",
            field=models.CharField(
                choices=_TIPO_CORRENTE,
                default="CA",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaominidisjuntor",
            name="tipo_protecao",
            field=models.CharField(
                choices=_TIPO_PROT,
                default="TERMOMAGNETICO",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.RunPython(
            _preencher_mini_disjuntor_a_partir_campos_legados,
            _noop,
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="faixa_ajuste_max_a",
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="faixa_ajuste_min_a",
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="polos",
        ),
    ]
