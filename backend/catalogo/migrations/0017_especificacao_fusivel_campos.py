from django.db import migrations, models

_TIPO_FUSIVEL_NOVO = [
    ("ULTRARAPIDO", "Ultrarrápido"),
    ("RAPIDO", "Rápido"),
    ("RETARDADO", "Retardado"),
]

_FORMATO = [
    ("NH", "NH"),
    ("CARTUCHO", "Cartucho"),
]

_CLASSE_UTIL = [
    ("gG", "Proteção geral"),
    ("aM", "Proteção de motor"),
    ("aR", "Proteção de semicondutores"),
]

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


def _fusivel_mapear_campos_legado(apps, schema_editor):
    Fusivel = apps.get_model("catalogo", "EspecificacaoFusivel")
    for row in Fusivel.objects.all():
        tf = row.tipo_fusivel
        fmt = row.formato
        cl = "gG"
        if tf == "ULTRA_RAPIDO":
            new_tf = "ULTRARAPIDO"
        elif tf == "GG":
            new_tf = "RAPIDO"
            cl = "gG"
        elif tf == "AM":
            new_tf = "RAPIDO"
            cl = "aM"
        elif tf in ("RAPIDO", "RETARDADO"):
            new_tf = tf
        else:
            new_tf = "RAPIDO"
        if fmt in ("DIAZED", "NEOZED", "OUTRO"):
            fmt = "CARTUCHO"
        Fusivel.objects.filter(pk=row.pk).update(
            tipo_fusivel=new_tf,
            formato=fmt,
            classe_utilizacao=cl,
        )


def _fusivel_mapear_campos_legado_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0016_especificacao_fonte_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaofusivel",
            name="classe_utilizacao",
            field=models.CharField(
                choices=_CLASSE_UTIL,
                default="gG",
                max_length=5,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaofusivel",
            name="tamanho",
            field=models.CharField(
                blank=True,
                help_text="Ex: NH00, NH1, 10x38, 14x51.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaofusivel",
            name="tensao_nominal_v",
            field=models.IntegerField(
                choices=_TENSAO_INTEGER_CHOICES,
                default=380,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaofusivel",
            name="capacidade_interrupcao_ka",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaofusivel",
            name="indicador_queima",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(
            _fusivel_mapear_campos_legado,
            _fusivel_mapear_campos_legado_reverse,
        ),
        migrations.AlterField(
            model_name="especificacaofusivel",
            name="tipo_fusivel",
            field=models.CharField(
                choices=_TIPO_FUSIVEL_NOVO,
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaofusivel",
            name="formato",
            field=models.CharField(
                choices=_FORMATO,
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaofusivel",
            name="modo_montagem",
        ),
    ]
