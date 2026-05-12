from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0071_remove_produtos_resistencia_aquecimento"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="especificacaopainel",
            name="profundidade_util_mm",
        ),
    ]
