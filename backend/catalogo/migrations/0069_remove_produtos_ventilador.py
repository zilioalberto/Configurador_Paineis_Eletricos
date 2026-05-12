from django.db import migrations


def remover_produtos_ventilador(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="VENTILADOR").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0068_climatizacao_remove_tipo_corrente_restringe_tensao"),
    ]

    operations = [
        migrations.RunPython(
            remover_produtos_ventilador,
            migrations.RunPython.noop,
        ),
    ]
