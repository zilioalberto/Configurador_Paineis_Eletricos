from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0065_painel_placa_consolidada_remove_placa_montagem"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaopainel",
            name="cor",
            field=models.CharField(
                choices=[
                    ("RAL7035", "RAL 7035 (cinza claro)"),
                    ("RAL7032", "RAL 7032 (bege)"),
                ],
                default="RAL7035",
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaopainel",
            name="possui_ventilacao",
        ),
        migrations.RemoveField(
            model_name="especificacaopainel",
            name="possui_fechadura",
        ),
    ]
