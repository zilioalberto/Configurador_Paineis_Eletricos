from django.db import migrations, models


_TIPOB = [
    ("BARRA_CHATA", "Barra chata"),
    ("BARRAMENTO_PENTE", "Barramento pente"),
    ("BARRAMENTO_TRIFASICO", "Barramento trifásico"),
    ("BARRAMENTO_DISTRIBUICAO", "Barramento de distribuição"),
]
_POLOS = [
    ("1P", "1 Polo"),
    ("2P", "2 Polos"),
    ("3P", "3 Polos"),
    ("4P", "4 Polos"),
]
_MODO = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
]
_MATERIAL = [("COBRE", "Cobre"), ("ALUMINIO", "Alumínio")]


def _material_para_choice_valido(apps, schema_editor):
    M = apps.get_model("catalogo", "EspecificacaoBarramento")
    for obj in M.objects.all():
        m = getattr(obj, "material", "") or ""
        m = str(m).strip().upper()
        if m not in ("COBRE", "ALUMINIO"):
            m = "COBRE"
        obj.material = m
        obj.save(update_fields=["material"])


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0007_rele_sobrecarga_alinha_disjuntor_motor"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaobarramento",
            name="capacidade_curto_circuito_ka",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
        migrations.AddField(
            model_name="especificacaobarramento",
            name="comprimento_mm",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True
            ),
        ),
        migrations.AddField(
            model_name="especificacaobarramento",
            name="espessura_mm",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
        migrations.AddField(
            model_name="especificacaobarramento",
            name="isolado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaobarramento",
            name="largura_mm",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
        migrations.AddField(
            model_name="especificacaobarramento",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO,
                default="TRILHO_DIN",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaobarramento",
            name="numero_polos",
            field=models.CharField(
                choices=_POLOS,
                default="3P",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaobarramento",
            name="tipo_barramento",
            field=models.CharField(
                choices=_TIPOB,
                default="BARRA_CHATA",
                max_length=40,
            ),
            preserve_default=False,
        ),
        migrations.RunPython(_material_para_choice_valido, _noop),
        migrations.AlterField(
            model_name="especificacaobarramento",
            name="corrente_nominal_a",
            field=models.DecimalField(decimal_places=2, max_digits=10),
        ),
        migrations.AlterField(
            model_name="especificacaobarramento",
            name="material",
            field=models.CharField(
                choices=_MATERIAL,
                default="COBRE",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaobarramento",
            name="secao_mm2",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True
            ),
        ),
        migrations.AlterField(
            model_name="especificacaobarramento",
            name="tensao_nominal_v",
            field=models.IntegerField(
                blank=True,
                choices=[
                    (12, "12 V"),
                    (24, "24 V"),
                    (48, "48 V"),
                    (90, "90 V"),
                    (110, "110 V"),
                    (127, "127 V"),
                    (220, "220 V"),
                    (380, "380 V"),
                    (440, "440 V"),
                ],
                null=True,
            ),
        ),
    ]
