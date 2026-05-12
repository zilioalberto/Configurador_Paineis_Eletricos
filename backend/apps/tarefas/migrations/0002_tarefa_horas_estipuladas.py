import django.core.validators
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tarefas", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="tarefa",
            name="horas_estipuladas",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=7,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
            ),
        ),
    ]
