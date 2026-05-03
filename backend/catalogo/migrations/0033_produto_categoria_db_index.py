from django.db import migrations, models

from core.choices.produtos import CategoriaProdutoNomeChoices


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0032_categoria_minidisjuntor_sem_separador"),
    ]

    operations = [
        migrations.AlterField(
            model_name="produto",
            name="categoria",
            field=models.CharField(
                choices=CategoriaProdutoNomeChoices.choices,
                db_index=True,
                max_length=50,
            ),
        ),
    ]
