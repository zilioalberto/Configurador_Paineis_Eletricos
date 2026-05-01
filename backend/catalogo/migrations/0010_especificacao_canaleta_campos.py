from django.db import migrations, models

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
]

_TIPO_CANALETA = [
    ("RANHURADA", "Ranhurada"),
    ("FECHADA", "Fechada"),
    ("PERFURADA", "Perfurada"),
]

_MATERIAL_CANALETA = [
    ("PVC", "PVC"),
    ("METALICA", "Metálica"),
]

_COR_CANALETA = [
    ("CINZA", "Cinza"),
    ("BRANCA", "Branca"),
    ("AZUL", "Azul"),
]


def _canaleta_normalizar_material(apps, schema_editor):
    Canaleta = apps.get_model("catalogo", "EspecificacaoCanaleta")
    for row in Canaleta.objects.all():
        m = (row.material or "").strip().lower()
        if any(
            s in m
            for s in (
                "metal",
                "metál",
                "metalic",
                "aço",
                "aco",
                "ferro",
                "galvan",
                "sheet",
                "steel",
            )
        ):
            row.material = "METALICA"
        else:
            row.material = "PVC"
        row.save(update_fields=["material"])


def _canaleta_normalizar_material_reverse(apps, schema_editor):
    pass


def _canaleta_preencher_area_util(apps, schema_editor):
    Canaleta = apps.get_model("catalogo", "EspecificacaoCanaleta")
    for row in Canaleta.objects.all():
        if (
            row.area_util_mm2 is None
            and row.largura_mm is not None
            and row.altura_mm is not None
        ):
            row.area_util_mm2 = row.largura_mm * row.altura_mm
            row.save(update_fields=["area_util_mm2"])


def _canaleta_preencher_area_util_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0009_espec_borne_cabo_botao"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaocanaleta",
            old_name="largura_interna_mm",
            new_name="largura_mm",
        ),
        migrations.RenameField(
            model_name="especificacaocanaleta",
            old_name="altura_interna_mm",
            new_name="altura_mm",
        ),
        migrations.AddField(
            model_name="especificacaocanaleta",
            name="tipo_canaleta",
            field=models.CharField(
                choices=_TIPO_CANALETA,
                default="RANHURADA",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaocanaleta",
            name="comprimento_mm",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Comprimento comercial da peça, quando aplicável.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocanaleta",
            name="area_util_mm2",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Área útil interna da canaleta. Se vazio, pode ser calculada por largura x altura.",
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocanaleta",
            name="cor",
            field=models.CharField(
                choices=_COR_CANALETA,
                default="CINZA",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaocanaleta",
            name="com_tampa",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaocanaleta",
            name="perfurada",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaocanaleta",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="PLACA",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            _canaleta_normalizar_material,
            _canaleta_normalizar_material_reverse,
        ),
        migrations.AlterField(
            model_name="especificacaocanaleta",
            name="material",
            field=models.CharField(
                choices=_MATERIAL_CANALETA,
                default="PVC",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            _canaleta_preencher_area_util,
            _canaleta_preencher_area_util_reverse,
        ),
    ]
