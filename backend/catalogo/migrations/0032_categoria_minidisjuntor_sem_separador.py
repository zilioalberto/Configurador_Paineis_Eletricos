from django.db import migrations


def atualizar_categoria_minidisjuntor(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="MINI_DISJUNTOR").update(
        categoria="MINIDISJUNTOR"
    )


def reverter_categoria_minidisjuntor(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="MINIDISJUNTOR").update(
        categoria="MINI_DISJUNTOR"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0031_especificacao_ventilador_campos"),
    ]

    operations = [
        migrations.RunPython(
            atualizar_categoria_minidisjuntor,
            reverter_categoria_minidisjuntor,
        ),
    ]
