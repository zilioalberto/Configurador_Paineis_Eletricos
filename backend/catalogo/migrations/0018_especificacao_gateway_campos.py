from django.db import migrations, models

_PROTOCOLO = [
    ("MODBUS_TCP", "Modbus TCP"),
    ("MODBUS_RTU", "Modbus RTU"),
    ("PROFINET", "Profinet"),
    ("ETHERNET_IP", "EtherNet/IP"),
    ("PROFIBUS", "Profibus"),
    ("CANOPEN", "CANopen"),
    ("OPC_UA", "OPC UA"),
    ("MQTT", "MQTT"),
    ("OUTRO", "Outro"),
]

_INTERFACE = [
    ("ETHERNET", "Ethernet"),
    ("RS485", "RS-485"),
    ("RS232", "RS-232"),
    ("USB", "USB"),
    ("WIFI", "Wi-Fi"),
]

_TIPO_CORRENTE = [
    ("CA", "Corrente Alternada"),
    ("CC", "Corrente Contínua"),
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

_MODO_MONTAGEM = [
    ("TRILHO_DIN", "Trilho DIN"),
    ("PLACA", "Placa de montagem"),
    ("PORTA", "Porta"),
    ("LATERAL", "Lateral do painel"),
    ("FUNDO", "Fundo do painel"),
    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
]


def _gateway_observacao_de_legado(apps, schema_editor):
    Gateway = apps.get_model("catalogo", "EspecificacaoGateway")
    for row in Gateway.objects.all():
        obs = row.protocolos_suportados or ""
        Gateway.objects.filter(pk=row.pk).update(observacao_protocolos=obs)


def _gateway_observacao_de_legado_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0017_especificacao_fusivel_campos"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaogateway",
            name="protocolo_entrada",
            field=models.CharField(
                choices=_PROTOCOLO,
                default="MODBUS_RTU",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="protocolo_saida",
            field=models.CharField(
                choices=_PROTOCOLO,
                default="MODBUS_TCP",
                max_length=30,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="interface_entrada",
            field=models.CharField(
                choices=_INTERFACE,
                default="RS485",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="interface_saida",
            field=models.CharField(
                choices=_INTERFACE,
                default="ETHERNET",
                max_length=20,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="quantidade_portas_ethernet",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="quantidade_portas_serial",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="suporta_modbus_tcp",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="suporta_modbus_rtu",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="suporta_profinet",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="suporta_ethernet_ip",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="suporta_profibus",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="suporta_opc_ua",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="suporta_mqtt",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="tipo_corrente_alimentacao",
            field=models.CharField(
                blank=True,
                choices=_TIPO_CORRENTE,
                max_length=2,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaogateway",
            name="observacao_protocolos",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="especificacaogateway",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                blank=True,
                choices=_TENSAO_INTEGER_CHOICES,
                null=True,
            ),
        ),
        migrations.RunPython(
            _gateway_observacao_de_legado,
            _gateway_observacao_de_legado_reverse,
        ),
        migrations.RemoveField(
            model_name="especificacaogateway",
            name="protocolos_suportados",
        ),
    ]
