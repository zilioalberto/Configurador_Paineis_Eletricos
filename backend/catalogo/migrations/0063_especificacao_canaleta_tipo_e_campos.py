from django.db import migrations, models


def migrar_canaleta_tipos(apps, schema_editor):
    Model = apps.get_model("catalogo", "EspecificacaoCanaleta")
    for row in Model.objects.filter(tipo_canaleta__in=("RANHURADA", "PERFURADA")).iterator():
        Model.objects.filter(pk=row.pk).update(tipo_canaleta="COM_RECORTE")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0062_especificacao_canaleta_modo_montagem"),
    ]

    operations = [
        migrations.RunPython(migrar_canaleta_tipos, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaocanaleta",
            name="com_tampa",
        ),
        migrations.RemoveField(
            model_name="especificacaocanaleta",
            name="perfurada",
        ),
        migrations.AlterField(
            model_name="especificacaocanaleta",
            name="tipo_canaleta",
            field=models.CharField(
                choices=[
                    ("FECHADA", "Fechada"),
                    ("COM_RECORTE", "Com recorte"),
                ],
                default="FECHADA",
                max_length=20,
            ),
        ),
    ]
