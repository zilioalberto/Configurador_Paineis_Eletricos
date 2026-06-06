from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orcamentos", "0012_oferta_arquivos_envios"),
    ]

    operations = [
        migrations.AddField(
            model_name="orcamento",
            name="desconto_comercial_ativo",
            field=models.BooleanField(
                default=False,
                help_text="Exibe desconto e resumo financeiro detalhado na oferta ao cliente.",
            ),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="desconto_percentual",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=7,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
            ),
        ),
    ]
