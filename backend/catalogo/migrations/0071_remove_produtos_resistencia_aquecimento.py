from django.db import migrations


def remover_produtos_resistencia_aquecimento(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="RESISTENCIA_AQUECIMENTO").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0070_remove_produtos_filtro_ar"),
    ]

    operations = [
        migrations.RunPython(
            remover_produtos_resistencia_aquecimento,
            migrations.RunPython.noop,
        ),
    ]
