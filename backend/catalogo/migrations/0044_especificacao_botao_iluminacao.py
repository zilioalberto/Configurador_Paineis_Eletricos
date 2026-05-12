from django.db import migrations, models


def limpar_tensao_iluminacao_botao_invalida(apps, schema_editor):
    Botao = apps.get_model("catalogo", "EspecificacaoBotao")
    valid = {24, 110, 220}
    for row in Botao.objects.iterator():
        v = row.tensao_iluminacao_v
        if v is not None and v not in valid:
            row.tensao_iluminacao_v = None
            row.save(update_fields=["tensao_iluminacao_v"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0043_restringe_campos_botao"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="especificacaobotao",
            name="tipo_corrente_iluminacao",
        ),
        migrations.RunPython(
            limpar_tensao_iluminacao_botao_invalida,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="especificacaobotao",
            name="tensao_iluminacao_v",
            field=models.IntegerField(
                blank=True,
                choices=[(24, "24 V"), (110, "110 V"), (220, "220 V")],
                null=True,
            ),
        ),
    ]
