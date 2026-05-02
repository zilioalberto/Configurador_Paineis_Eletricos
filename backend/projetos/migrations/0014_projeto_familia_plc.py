# Generated manually for projeto.familia_plc

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0013_projeto_responsavel"),
    ]

    operations = [
        migrations.AddField(
            model_name="projeto",
            name="familia_plc",
            field=models.CharField(
                blank=True,
                help_text="Família do PLC conforme catálogo (EspecificacaoPLC), quando o projeto possui PLC.",
                max_length=100,
                null=True,
            ),
        ),
    ]
