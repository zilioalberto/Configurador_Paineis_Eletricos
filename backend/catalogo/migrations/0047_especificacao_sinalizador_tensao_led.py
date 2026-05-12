from django.db import migrations, models


def ajustar_tensao_comando_sinalizador(apps, schema_editor):
    Sinalizador = apps.get_model("catalogo", "EspecificacaoSinalizador")
    valid = {24, 110, 220}
    for row in Sinalizador.objects.iterator():
        if row.tensao_comando_v not in valid:
            row.tensao_comando_v = 24
            row.save(update_fields=["tensao_comando_v"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0046_remove_chave_seletora_retorno_automatico"),
    ]

    operations = [
        migrations.RunPython(ajustar_tensao_comando_sinalizador, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaosinalizador",
            name="led",
        ),
        migrations.AlterField(
            model_name="especificacaosinalizador",
            name="tensao_comando_v",
            field=models.IntegerField(
                choices=[(24, "24 V"), (110, "110 V"), (220, "220 V")],
            ),
        ),
    ]
