from django.db import migrations, models


def normaliza_gateway_modo_montagem(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoGateway")
    valid = {"TRILHO_DIN", "PLACA"}
    for row in Model.objects.exclude(modo_montagem__in=valid).iterator():
        Model.objects.filter(pk=row.pk).update(modo_montagem="TRILHO_DIN")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0056_modulo_comunicacao_familia_montagem"),
    ]

    operations = [
        migrations.RunPython(normaliza_gateway_modo_montagem, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="especificacaogateway",
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
