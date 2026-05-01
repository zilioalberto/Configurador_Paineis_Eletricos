from django.db import migrations, models

from core.choices.produtos import (
    InterfaceFisicaGatewayChoices,
    ProtocoloIndustrialChoices,
    TipoModuloComunicacaoChoices,
)


def _normaliza_protocolo_modulo_comunicacao(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoModuloComunicacao")
    PIC = ProtocoloIndustrialChoices
    valid = {m.value for m in PIC}

    texto_para_enum = {
        "modbus rtu": PIC.MODBUS_RTU,
        "modbus tcp": PIC.MODBUS_TCP,
        "profinet": PIC.PROFINET,
        "ethernet/ip": PIC.ETHERNET_IP,
        "ethernet ip": PIC.ETHERNET_IP,
        "profibus": PIC.PROFIBUS,
        "profibus dp": PIC.PROFIBUS,
        "canopen": PIC.CANOPEN,
        "opc ua": PIC.OPC_UA,
        "mqtt": PIC.MQTT,
    }

    for row in Model.objects.all().only("id", "protocolo"):
        raw = (row.protocolo or "").strip()
        if raw in valid:
            continue
        key = raw.lower().replace("/", " ").strip()
        while "  " in key:
            key = key.replace("  ", " ")
        novo = texto_para_enum.get(key, PIC.OUTRO)
        Model.objects.filter(pk=row.pk).update(protocolo=novo)


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0020_inversor_frequencia_campos"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaomodulocomunicacao",
            old_name="protocolo_principal",
            new_name="protocolo",
        ),
        migrations.RunPython(
            _normaliza_protocolo_modulo_comunicacao,
            _noop,
        ),
        migrations.AlterField(
            model_name="especificacaomodulocomunicacao",
            name="protocolo",
            field=models.CharField(
                choices=ProtocoloIndustrialChoices.choices,
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="familia_plc",
            field=models.CharField(
                blank=True,
                help_text="Ex.: Siemens S7-1200, Schneider M221, WEG CFW.",
                max_length=100,
                default="",
            ),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="tipo_modulo",
            field=models.CharField(
                choices=TipoModuloComunicacaoChoices.choices,
                default=TipoModuloComunicacaoChoices.INTERFACE_REDE,
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="interface_fisica",
            field=models.CharField(
                choices=InterfaceFisicaGatewayChoices.choices,
                default=InterfaceFisicaGatewayChoices.ETHERNET,
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="quantidade_portas",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="suporta_master",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="suporta_slave",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="suporta_client",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="especificacaomodulocomunicacao",
            name="suporta_server",
            field=models.BooleanField(default=False),
        ),
    ]
