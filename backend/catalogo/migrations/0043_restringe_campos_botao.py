from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0042_simplifica_soft_starter"),
    ]

    operations = [
        migrations.AlterField(
            model_name="especificacaobotao",
            name="diametro_furo_mm",
            field=models.DecimalField(
                choices=[(Decimal("22"), "22 mm"), (Decimal("30"), "30 mm")],
                decimal_places=2,
                default=Decimal("22"),
                max_digits=5,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaobotao",
            name="grau_protecao_ip",
            field=models.CharField(
                blank=True,
                choices=[
                    ("IP55", "IP55"),
                    ("IP65", "IP65"),
                    ("IP66", "IP66"),
                    ("IP67", "IP67"),
                    ("IP69K", "IP69K"),
                ],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaobotao",
            name="modo_montagem",
            field=models.CharField(
                choices=[("PORTA", "Porta")],
                default="PORTA",
                max_length=20,
            ),
        ),
    ]
