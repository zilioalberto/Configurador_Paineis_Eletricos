from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dimensionamento", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="resumodimensionamento",
            name="detalhe_dimensionamento_mecanico",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Memória de cálculo, itens considerados e sugestões de painéis comerciais.",
            ),
        ),
    ]
