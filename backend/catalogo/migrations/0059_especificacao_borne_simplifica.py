from django.db import migrations, models


def migrar_borne_antes_restricao(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoBorne")
    valid_m = {"TRILHO_DIN", "PLACA"}
    for row in Model.objects.filter(tipo_borne="DUPLO_NIVEL").iterator():
        niv = row.numero_niveis or 1
        if niv < 2:
            niv = 2
        Model.objects.filter(pk=row.pk).update(
            tipo_borne="PASSAGEM",
            numero_niveis=niv,
        )
    for row in Model.objects.exclude(modo_montagem__in=valid_m).iterator():
        Model.objects.filter(pk=row.pk).update(modo_montagem="TRILHO_DIN")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0058_fonte_chaveada_simplifica"),
    ]

    operations = [
        migrations.RunPython(migrar_borne_antes_restricao, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaoborne",
            name="tensao_nominal_v",
        ),
        migrations.RemoveField(
            model_name="especificacaoborne",
            name="numero_conexoes",
        ),
        migrations.RemoveField(
            model_name="especificacaoborne",
            name="possui_terra",
        ),
        migrations.RemoveField(
            model_name="especificacaoborne",
            name="possui_seccionamento",
        ),
        migrations.AlterField(
            model_name="especificacaoborne",
            name="tipo_borne",
            field=models.CharField(
                choices=[
                    ("PASSAGEM", "Passagem"),
                    ("TERRA", "Terra"),
                    ("FUSIVEL", "Fusível"),
                    ("SECCIONAVEL", "Seccionável"),
                    ("SENSOR", "Sensor"),
                    ("AFERICAO", "Borne de aferição"),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoborne",
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
