from django.db import migrations


def remover_produtos_acoplador(apps, schema_editor):
    Produto = apps.get_model("catalogo", "Produto")
    Produto.objects.filter(categoria="ACOPLADOR").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0060_especificacao_barramento_simplifica"),
    ]

    operations = [
        migrations.RunPython(remover_produtos_acoplador, migrations.RunPython.noop),
        migrations.DeleteModel(name="EspecificacaoAcoplador"),
    ]
