from django.db import migrations


def remover_produtos_filtro_ar(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="FILTRO_AR").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0069_remove_produtos_ventilador"),
    ]

    operations = [
        migrations.RunPython(
            remover_produtos_filtro_ar,
            migrations.RunPython.noop,
        ),
    ]
