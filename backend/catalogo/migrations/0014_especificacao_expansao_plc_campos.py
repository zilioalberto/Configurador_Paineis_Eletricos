from django.db import migrations, models

_TIPO_EXPANSAO = [
    ("ENTRADA_DIGITAL", "Entrada Digital"),
    ("SAIDA_DIGITAL", "Saída Digital"),
    ("ENTRADA_ANALOGICA", "Entrada Analógica"),
    ("SAIDA_ANALOGICA", "Saída Analógica"),
    ("MISTA_DIGITAL", "Mista Digital"),
    ("MISTA_ANALOGICA", "Mista Analógica"),
    ("MISTA_GERAL", "Mista Geral"),
]

_TIPO_CORRENTE = [
    ("CA", "Corrente Alternada"),
    ("CC", "Corrente Contínua"),
]

_TIPO_SINAL_DIGITAL = [
    ("PNP", "PNP"),
    ("NPN", "NPN"),
    ("RELE", "Relé"),
]

_TIPO_SINAL_ANALOGICO = [
    ("4_20MA", "4-20 mA"),
    ("0_10V", "0-10 V"),
    ("UNIVERSAL", "Universal"),
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

def _expansao_plc_mapear_legado(apps, schema_editor):
    E = apps.get_model("catalogo", "EspecificacaoExpansaoPLC")
    for row in E.objects.all():
        tm = row.tipo_modulo
        n = row.numero_canais
        ed = sd = ea = sa = 0
        if tm == "DI":
            te = "ENTRADA_DIGITAL"
            ed = max(1, n)
        elif tm == "DO":
            te = "SAIDA_DIGITAL"
            sd = max(1, n)
        elif tm == "AI":
            te = "ENTRADA_ANALOGICA"
            ea = max(1, n)
        elif tm == "AO":
            te = "SAIDA_ANALOGICA"
            sa = max(1, n)
        elif tm == "MIXTA":
            te = "MISTA_DIGITAL"
            ed = max(1, n // 2) if n else 1
            sd = max(0, n - ed)
            if ed + sd == 0:
                ed = 1
        else:
            te = "MISTA_GERAL"
            ed = max(1, n) if n else 1
        E.objects.filter(pk=row.pk).update(
            tipo_expansao=te,
            entradas_digitais=ed,
            saidas_digitais=sd,
            entradas_analogicas=ea,
            saidas_analogicas=sa,
        )


def _expansao_plc_mapear_legado_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0013_especificacao_controlador_temperatura_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="tipo_expansao",
            field=models.CharField(
                choices=_TIPO_EXPANSAO,
                default="ENTRADA_DIGITAL",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="familia_plc",
            field=models.CharField(
                blank=True,
                help_text="Ex: Siemens S7-1200, Siemens S7-1500, WEG, Schneider.",
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="entradas_digitais",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="saidas_digitais",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="entradas_analogicas",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="saidas_analogicas",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                blank=True,
                choices=_TENSAO_INTEGER_CHOICES,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="tipo_corrente_alimentacao",
            field=models.CharField(
                blank=True,
                choices=_TIPO_CORRENTE,
                max_length=2,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="tipo_sinal_digital",
            field=models.CharField(
                blank=True,
                choices=_TIPO_SINAL_DIGITAL,
                default="",
                max_length=10,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="tipo_sinal_analogico",
            field=models.CharField(
                blank=True,
                choices=_TIPO_SINAL_ANALOGICO,
                default="",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoexpansaoplc",
            name="protocolo_comunicacao",
            field=models.CharField(
                blank=True,
                help_text="Ex: Profinet, Modbus TCP, EtherNet/IP.",
                max_length=50,
            ),
        ),
        migrations.RunPython(
            _expansao_plc_mapear_legado,
            _expansao_plc_mapear_legado_reverse,
        ),
        migrations.RemoveField(
            model_name="especificacaoexpansaoplc",
            name="tipo_modulo",
        ),
        migrations.RemoveField(
            model_name="especificacaoexpansaoplc",
            name="numero_canais",
        ),
        migrations.AlterModelOptions(
            name="especificacaoexpansaoplc",
            options={
                "verbose_name": "Especificação de Expansão PLC",
                "verbose_name_plural": "Especificações de Expansões PLC",
            },
        ),
    ]
