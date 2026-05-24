from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0005_parceiro_sintegra"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="parceirocomercial",
            name="consulta_sintegra_em",
        ),
        migrations.RemoveField(
            model_name="parceirocomercial",
            name="sintegra_ultima_atualizacao",
        ),
    ]
