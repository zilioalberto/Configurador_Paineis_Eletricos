from django.db import migrations, models

_TIPO_SENSOR = [
    ("PT100", "PT100"),
    ("TERMOPAR_J", "Termopar J"),
    ("TERMOPAR_K", "Termopar K"),
    ("NTC", "NTC"),
    ("UNIVERSAL", "Entrada universal"),
]

_TIPO_SAIDA = [
    ("RELE", "Relé"),
    ("SSR", "SSR"),
    ("ANALOGICA_4_20MA", "Analógica 4-20mA"),
    ("ANALOGICA_0_10V", "Analógica 0-10V"),
]

_TIPO_CONTROLE = [
    ("ON_OFF", "On/Off"),
    ("PID", "PID"),
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


def _controlador_temp_map_tipo_sensor_legado(apps, schema_editor):
    CT = apps.get_model("catalogo", "EspecificacaoControladorTemperatura")
    for row in CT.objects.all():
        t = (row.legado_tipo_sensor_livre or "").strip().lower()
        if "pt100" in t or "pt-100" in t:
            v = "PT100"
        elif "ntc" in t:
            v = "NTC"
        elif "termopar" in t or "termo" in t:
            if " j" in t or t.endswith(" j") or "tipo j" in t or t.strip() == "j":
                v = "TERMOPAR_J"
            elif " k" in t or t.endswith(" k") or "tipo k" in t or t.strip() == "k":
                v = "TERMOPAR_K"
            else:
                v = "UNIVERSAL"
        elif t:
            v = "UNIVERSAL"
        else:
            v = "PT100"
        CT.objects.filter(pk=row.pk).update(tipo_sensor=v)


def _controlador_temp_map_tipo_sensor_legado_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0012_especificacao_climatizacao_campos"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaocontroladortemperatura",
            old_name="tipo_sensor",
            new_name="legado_tipo_sensor_livre",
        ),
        migrations.RenameField(
            model_name="especificacaocontroladortemperatura",
            old_name="numero_saidas",
            new_name="quantidade_saidas",
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="tipo_sensor",
            field=models.CharField(
                choices=_TIPO_SENSOR,
                default="PT100",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="tipo_controle",
            field=models.CharField(
                choices=_TIPO_CONTROLE,
                default="PID",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="tipo_saida_controle",
            field=models.CharField(
                choices=_TIPO_SAIDA,
                default="RELE",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="possui_saida_alarme",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="quantidade_saidas_alarme",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="tipo_corrente_alimentacao",
            field=models.CharField(
                choices=_TIPO_CORRENTE,
                default="CA",
                max_length=2,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="faixa_temperatura_min_c",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="faixa_temperatura_max_c",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="dimensao_frontal_mm",
            field=models.CharField(
                blank=True,
                help_text="Ex: 48x48, 48x96, 96x96.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="protocolo_comunicacao",
            field=models.CharField(
                blank=True,
                help_text="Ex: Modbus RTU, Ethernet, sem comunicação.",
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name="especificacaocontroladortemperatura",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="PORTA",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            _controlador_temp_map_tipo_sensor_legado,
            _controlador_temp_map_tipo_sensor_legado_reverse,
        ),
        migrations.RemoveField(
            model_name="especificacaocontroladortemperatura",
            name="legado_tipo_sensor_livre",
        ),
    ]
