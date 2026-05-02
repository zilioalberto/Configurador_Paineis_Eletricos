import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0014_projeto_familia_plc"),
    ]

    operations = [
        migrations.AddField(
            model_name="projeto",
            name="degraus_margem_bitola_condutores",
            field=models.PositiveSmallIntegerField(
                default=0,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(25),
                ],
                help_text=(
                    "Margem sobre o mínimo normativo (tabela Iz): 0 = bitola mínima que atende a corrente; "
                    "1 = uma bitola comercial acima (ex.: 28 A → 4 mm² passa a 6 mm²); e assim por diante. "
                    "Aplica-se ao dimensionamento sugerido de condutores de potência e da alimentação geral."
                ),
            ),
        ),
    ]
