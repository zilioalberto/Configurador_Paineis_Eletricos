from django.db import migrations, models


def normaliza_modulo_comunicacao(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoModuloComunicacao")
    valid_m = {"TRILHO_DIN", "PLACA"}
    for row in Model.objects.iterator():
        updates = {}
        if row.familia_plc == "":
            updates["familia_plc"] = None
        if row.modo_montagem not in valid_m:
            updates["modo_montagem"] = "TRILHO_DIN"
        if updates:
            Model.objects.filter(pk=row.pk).update(**updates)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0055_especificacao_ihm_simplifica"),
    ]

    operations = [
        migrations.RunPython(normaliza_modulo_comunicacao, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="especificacaomodulocomunicacao",
            name="familia_plc",
            field=models.CharField(
                blank=True,
                help_text="Família ou linha do PLC compatível (texto livre; evite duplicar grafias parecidas).",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaomodulocomunicacao",
            name="modo_montagem",
            field=models.CharField(
                choices=[
                    ("TRILHO_DIN", "Trilho DIN"),
                    ("PLACA", "Placa de montagem"),
                ],
                default="TRILHO_DIN",
                max_length=20,
            ),
        ),
    ]
