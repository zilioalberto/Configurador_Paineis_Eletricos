from django.db import migrations, models


def normaliza_canaleta_modo_montagem(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoCanaleta")
    valid = {"PLACA", "PORTA"}
    for row in Model.objects.exclude(modo_montagem__in=valid).iterator():
        Model.objects.filter(pk=row.pk).update(modo_montagem="PLACA")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0061_remove_especificacao_acoplador"),
    ]

    operations = [
        migrations.RunPython(normaliza_canaleta_modo_montagem, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="especificacaocanaleta",
            name="modo_montagem",
            field=models.CharField(
                choices=[
                    ("PLACA", "Placa de montagem"),
                    ("PORTA", "Porta"),
                ],
                default="PLACA",
                max_length=20,
            ),
        ),
    ]
