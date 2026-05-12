from django.db import migrations, models


def normaliza_barramento_placa(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoBarramento")
    Model.objects.update(modo_montagem="PLACA")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0059_especificacao_borne_simplifica"),
    ]

    operations = [
        migrations.RunPython(normaliza_barramento_placa, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaobarramento",
            name="tensao_nominal_v",
        ),
        migrations.AlterField(
            model_name="especificacaobarramento",
            name="modo_montagem",
            field=models.CharField(
                choices=[("PLACA", "Placa de montagem")],
                default="PLACA",
                max_length=20,
            ),
        ),
    ]
