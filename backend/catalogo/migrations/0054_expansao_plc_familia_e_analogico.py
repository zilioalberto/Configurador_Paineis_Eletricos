from django.db import migrations, models


def migrar_tipo_sinal_analogico_expansao(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoExpansaoPLC")
    mapping = {
        "4_20MA": "MA_4_20",
        "0_10V": "V_0_10",
        "UNIVERSAL": "CONFIGURAVEL_SOFTWARE",
    }
    for row in Spec.objects.iterator():
        if row.tipo_sinal_analogico in mapping:
            row.tipo_sinal_analogico = mapping[row.tipo_sinal_analogico]
            row.save(update_fields=["tipo_sinal_analogico"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0053_especificacao_plc_tipo_analogico"),
    ]

    operations = [
        migrations.RunPython(migrar_tipo_sinal_analogico_expansao, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="especificacaoexpansaoplc",
            name="familia_plc",
            field=models.CharField(
                blank=True,
                help_text="Família ou linha do PLC compatível (texto livre; evite duplicar grafias parecidas).",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoexpansaoplc",
            name="tipo_sinal_analogico",
            field=models.CharField(
                blank=True,
                choices=[
                    ("MA_0_20", "0–20 mA"),
                    ("MA_4_20", "4–20 mA"),
                    ("V_0_10", "0–10 V"),
                    ("V_PM_10", "±10 V"),
                    ("V_0_5", "0–5 V"),
                    ("CONFIGURAVEL_SOFTWARE", "Configurável via software"),
                ],
                help_text="Obrigatório quando há entradas ou saídas analógicas.",
                max_length=30,
                null=True,
            ),
        ),
    ]
