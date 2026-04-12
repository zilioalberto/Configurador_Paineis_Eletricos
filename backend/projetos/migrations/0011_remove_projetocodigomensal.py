from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0010_projeto_codigo_automatico"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ProjetoCodigoMensal",
        ),
    ]
