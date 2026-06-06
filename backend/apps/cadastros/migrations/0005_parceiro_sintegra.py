from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0004_cnae_parceiro"),
    ]

    operations = [
        migrations.AddField(
            model_name="parceirocomercial",
            name="consulta_sintegra_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Ultima consulta de CNPJ na Sintegra WS (plugin RF).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="parceirocomercial",
            name="sintegra_ultima_atualizacao",
            field=models.CharField(
                blank=True,
                help_text="Campo ultima_atualizacao retornado pela Sintegra WS.",
                max_length=40,
            ),
        ),
    ]
