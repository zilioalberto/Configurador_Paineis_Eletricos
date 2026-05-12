from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0066_especificacao_painel_cor_remove_vent_fechadura"),
    ]

    operations = [
        migrations.AlterField(
            model_name="especificacaopainel",
            name="cor",
            field=models.CharField(
                blank=True,
                choices=[
                    ("RAL7035", "RAL 7035 (cinza claro)"),
                    ("RAL7032", "RAL 7032 (bege)"),
                ],
                default=None,
                max_length=20,
                null=True,
            ),
        ),
    ]
