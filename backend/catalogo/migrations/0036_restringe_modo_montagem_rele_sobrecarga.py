from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0035_simplifica_minidisjuntor"),
    ]

    operations = [
        migrations.AlterField(
            model_name="especificacaorelesobrecarga",
            name="modo_montagem",
            field=models.CharField(
                choices=[
                    ("TRILHO_DIN", "Trilho DIN"),
                    ("ACOPLADO_CONTATOR", "Acoplado ao contator"),
                ],
                max_length=20,
            ),
        ),
    ]
