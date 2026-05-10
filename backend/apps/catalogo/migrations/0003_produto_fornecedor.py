import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0002_parceiro_comercial"),
        ("catalogo", "0002_produto_preco_base_align"),
    ]

    operations = [
        migrations.AddField(
            model_name="produto",
            name="fabricante_parceiro",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"ativo": True, "eh_fornecedor": True},
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="produtos_fabricados_catalogo",
                to="cadastros.parceirocomercial",
            ),
        ),
    ]
