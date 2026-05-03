from django.db import migrations, models


def _normaliza_modo_montagem(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoReleEstadoSolido")
    Spec.objects.exclude(modo_montagem__in=["TRILHO_DIN", "PLACA"]).update(
        modo_montagem="TRILHO_DIN"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0037_simplifica_fusivel"),
    ]

    operations = [
        migrations.RunPython(_normaliza_modo_montagem, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="especificacaoreleestadosolido",
            name="modo_montagem",
            field=models.CharField(
                choices=[
                    ("TRILHO_DIN", "Trilho DIN"),
                    ("PLACA", "Placa de montagem"),
                ],
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaoreleestadosolido",
            name="tensao_carga_v",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleestadosolido",
            name="tipo_corrente_carga",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleestadosolido",
            name="tensao_controle_v",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleestadosolido",
            name="tipo_corrente_controle",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleestadosolido",
            name="tipo_comutacao",
        ),
    ]
