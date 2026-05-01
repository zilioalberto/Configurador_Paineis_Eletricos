from django.db import migrations, models


def normaliza_fonte_modo_montagem(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoFonte")
    valid = {"TRILHO_DIN", "PLACA"}
    for row in Model.objects.exclude(modo_montagem__in=valid).iterator():
        Model.objects.filter(pk=row.pk).update(modo_montagem="TRILHO_DIN")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0057_gateway_modo_montagem"),
    ]

    operations = [
        migrations.RunPython(normaliza_fonte_modo_montagem, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaofonte",
            name="numero_saidas",
        ),
        migrations.RemoveField(
            model_name="especificacaofonte",
            name="rendimento_percentual",
        ),
        migrations.RemoveField(
            model_name="especificacaofonte",
            name="ajuste_tensao_saida",
        ),
        migrations.RemoveField(
            model_name="especificacaofonte",
            name="protecao_curto",
        ),
        migrations.RemoveField(
            model_name="especificacaofonte",
            name="protecao_sobrecarga",
        ),
        migrations.RemoveField(
            model_name="especificacaofonte",
            name="protecao_sobretensao",
        ),
        migrations.AlterField(
            model_name="especificacaofonte",
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
