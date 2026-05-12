from django.db import migrations, models

_TIPO_TELA = [
    ("TOUCH", "Touchscreen"),
    ("TECLADO", "Teclado"),
    ("TOUCH_TECLADO", "Touch + Teclado"),
]

_TIPO_DISPLAY = [
    ("TFT", "TFT"),
    ("LCD", "LCD"),
    ("OLED", "OLED"),
]

_PROTOCOLO_IHM = [
    ("PROFINET", "Profinet"),
    ("MODBUS_TCP", "Modbus TCP"),
    ("MODBUS_RTU", "Modbus RTU"),
    ("ETHERNET_IP", "EtherNet/IP"),
    ("OPC_UA", "OPC UA"),
    ("SERIAL", "Serial"),
    ("OUTRO", "Outro"),
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


def _ihm_resolucao_de_tecnologia_legada(apps, schema_editor):
    IHM = apps.get_model("catalogo", "EspecificacaoIHM")
    for row in IHM.objects.all():
        t = (row.tecnologia_painel or "").strip()
        if t:
            IHM.objects.filter(pk=row.pk).update(resolucao=t[:30])


def _ihm_resolucao_de_tecnologia_legada_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0018_especificacao_gateway_campos"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaoihm",
            old_name="diagonal_polegadas",
            new_name="tamanho_tela_pol",
        ),
        migrations.AlterField(
            model_name="especificacaoihm",
            name="tamanho_tela_pol",
            field=models.DecimalField(
                decimal_places=2,
                help_text="Tamanho da tela em polegadas. Ex: 4.3, 7, 10.1.",
                max_digits=5,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="tipo_tela",
            field=models.CharField(
                choices=_TIPO_TELA,
                default="TOUCH",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="tipo_display",
            field=models.CharField(
                blank=True,
                choices=_TIPO_DISPLAY,
                default="",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="resolucao",
            field=models.CharField(
                blank=True,
                help_text="Ex: 480x272, 800x480, 1024x600.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="protocolo_comunicacao",
            field=models.CharField(
                choices=_PROTOCOLO_IHM,
                default="MODBUS_TCP",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="possui_ethernet",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="possui_serial",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="possui_usb",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="tipo_corrente_alimentacao",
            field=models.CharField(
                choices=_TIPO_CORRENTE,
                default="CC",
                max_length=2,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="consumo_w",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="grau_protecao_ip_frontal",
            field=models.CharField(
                blank=True,
                help_text="Ex: IP65.",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="dimensao_recorte_mm",
            field=models.CharField(
                blank=True,
                help_text="Ex: 192x138 mm.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoihm",
            name="modo_montagem",
            field=models.CharField(
                choices=_MODO_MONTAGEM,
                default="PORTA",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoihm",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                choices=_TENSAO_INTEGER_CHOICES,
                default=24,
            ),
        ),
        migrations.RunPython(
            _ihm_resolucao_de_tecnologia_legada,
            _ihm_resolucao_de_tecnologia_legada_reverse,
        ),
        migrations.RemoveField(
            model_name="especificacaoihm",
            name="tecnologia_painel",
        ),
    ]
