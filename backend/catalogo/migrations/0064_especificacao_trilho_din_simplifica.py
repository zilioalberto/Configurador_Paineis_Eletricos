from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0063_especificacao_canaleta_tipo_e_campos"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="especificacaotrilhodin",
            name="formato",
        ),
        migrations.RemoveField(
            model_name="especificacaotrilhodin",
            name="largura_mm",
        ),
        migrations.RemoveField(
            model_name="especificacaotrilhodin",
            name="altura_mm",
        ),
        migrations.RemoveField(
            model_name="especificacaotrilhodin",
            name="espessura_mm",
        ),
        migrations.RemoveField(
            model_name="especificacaotrilhodin",
            name="capacidade_carga_kg_m",
        ),
    ]
