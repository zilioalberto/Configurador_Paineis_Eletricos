from django.db import migrations, models


def _normaliza_soft_starter(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoSoftStarter")

    Spec.objects.exclude(tensao_nominal_v__in=[220, 380]).update(tensao_nominal_v=220)
    Spec.objects.filter(protocolo_comunicacao__isnull=True).update(protocolo_comunicacao="")

    Spec.objects.filter(numero_fases=2).update(numero_fase_controle="2F")
    Spec.objects.filter(numero_fases=3).update(numero_fase_controle="3F")
    Spec.objects.exclude(numero_fases__in=[2, 3]).update(numero_fase_controle="3F")

    Spec.objects.all().update(tipo_montagem="PLACA")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0041_restringe_inversor_frequencia"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaosoftstarter",
            name="numero_fase_controle",
            field=models.CharField(
                choices=[("2F", "2 fases"), ("3F", "3 fases")],
                default="3F",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaosoftstarter",
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
        migrations.RunPython(_normaliza_soft_starter, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="especificacaosoftstarter",
            name="tensao_nominal_v",
            field=models.IntegerField(
                choices=[(220, "220 V"), (380, "380 V")],
                help_text="Tensão nominal de operação.",
            ),
        ),
        migrations.AlterField(
            model_name="especificacaosoftstarter",
            name="tipo_montagem",
            field=models.CharField(
                choices=[("PLACA", "Placa de montagem")],
                default="PLACA",
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="numero_fases",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="tipo_controle",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="tipo_aplicacao",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="tipo_bypass",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="possui_contator_bypass_interno",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="corrente_partida_maxima",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="tempo_rampa_partida_s",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="tempo_rampa_parada_s",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="possui_protecao_sobrecarga",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="possui_protecao_falta_fase",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="possui_protecao_subtensao",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="possui_comunicacao",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="suporta_modbus",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="suporta_profinet",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="suporta_ethernet_ip",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="grau_protecao_ip",
        ),
        migrations.RemoveField(
            model_name="especificacaosoftstarter",
            name="observacoes",
        ),
    ]
