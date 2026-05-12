from django.db import migrations, models


def migrar_labels_familia_plc(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoPLC")
    mapping = {
        "SIEMENS_S7_1200": "Siemens S7-1200",
        "SIEMENS_S7_1500": "Siemens S7-1500",
        "WEG_CLIC02": "WEG CLIC02",
        "SCHNEIDER_MODICON": "Schneider Modicon",
        "ROCKWELL_COMPACTLOGIX": "Rockwell CompactLogix",
        "OUTRA": "Outra",
    }
    for row in Spec.objects.iterator():
        if row.familia in mapping:
            row.familia = mapping[row.familia]
            row.save(update_fields=["familia"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0051_normaliza_modo_montagem_catalogo"),
    ]

    operations = [
        migrations.RunPython(migrar_labels_familia_plc, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaoplc",
            name="tipo_plc",
        ),
        migrations.RemoveField(
            model_name="especificacaoplc",
            name="memoria_programa_kb",
        ),
        migrations.RemoveField(
            model_name="especificacaoplc",
            name="memoria_dados_kb",
        ),
        migrations.AlterField(
            model_name="especificacaoplc",
            name="familia",
            field=models.CharField(
                blank=True,
                help_text="Família ou linha do PLC (texto livre; evite duplicar grafias parecidas).",
                max_length=100,
                null=True,
            ),
        ),
    ]
