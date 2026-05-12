from django.db import migrations, models


def _normaliza_inversor_frequencia(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoInversorFrequencia")

    Spec.objects.exclude(tensao_entrada_v__in=[220, 380]).update(tensao_entrada_v=220)
    Spec.objects.exclude(tensao_saida_v__in=[220, 380]).update(tensao_saida_v=220)

    # Depois do AlterField para CharField, alguns bancos convertem 1/3 para "1"/"3".
    Spec.objects.filter(numero_fases_entrada__in=[1, "1"]).update(numero_fases_entrada="1F")
    Spec.objects.filter(numero_fases_entrada__in=[3, "3"]).update(numero_fases_entrada="3F")
    Spec.objects.exclude(numero_fases_entrada__in=["1F", "3F"]).update(
        numero_fases_entrada="3F"
    )

    Spec.objects.filter(protocolo_comunicacao__isnull=True).update(protocolo_comunicacao="")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0040_rele_estado_solido_tensao_ventilacao"),
    ]

    operations = [
        migrations.AlterField(
            model_name="especificacaoinversorfrequencia",
            name="numero_fases_entrada",
            field=models.CharField(
                choices=[("1F", "Monofásico (1F)"), ("3F", "Trifásico (3F)")],
                default="3F",
                max_length=2,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoinversorfrequencia",
            name="tensao_entrada_v",
            field=models.IntegerField(choices=[(220, "220 V"), (380, "380 V")]),
        ),
        migrations.AlterField(
            model_name="especificacaoinversorfrequencia",
            name="tensao_saida_v",
            field=models.IntegerField(choices=[(220, "220 V"), (380, "380 V")]),
        ),
        migrations.AlterField(
            model_name="especificacaoinversorfrequencia",
            name="protocolo_comunicacao",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "Sem protocolo de comunicação"),
                    ("PROFINET", "Profinet"),
                    ("PROFIBUS", "Profibus"),
                    ("MODBUS_TCP", "Modbus TCP"),
                    ("MODBUS_RTU", "Modbus RTU"),
                    ("ETHERNET_IP", "Ethernet/IP"),
                    ("OPC_UA", "OPC UA"),
                    ("SERIAL", "Serial"),
                    ("OUTRO", "Outro"),
                ],
                default="",
                max_length=50,
            ),
        ),
        migrations.RunPython(_normaliza_inversor_frequencia, migrations.RunPython.noop),
    ]
