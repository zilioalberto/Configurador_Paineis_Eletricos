"""Renomeia preco_base/preco_atualizado_em → custo_referencia/custo_atualizado_em.

O campo sempre funcionou como custo de referência (base do preço = custo × margem),
não como preço de venda. A renomeação apenas alinha o nome ao seu real significado.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0016_remove_produto_fabricante"),
    ]

    operations = [
        migrations.RenameField(
            model_name="produto",
            old_name="preco_base",
            new_name="custo_referencia",
        ),
        migrations.RenameField(
            model_name="produto",
            old_name="preco_atualizado_em",
            new_name="custo_atualizado_em",
        ),
        migrations.RenameField(
            model_name="servico",
            old_name="preco_base",
            new_name="custo_referencia",
        ),
        migrations.RenameField(
            model_name="servico",
            old_name="preco_atualizado_em",
            new_name="custo_atualizado_em",
        ),
        migrations.AlterField(
            model_name="produto",
            name="custo_referencia",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text=(
                    "Custo de referência (ex.: valor da última compra/NF-e). É a base para "
                    "compor o preço da oferta: preço = custo × (1 + margem do cliente)."
                ),
                max_digits=12,
            ),
        ),
        migrations.AlterField(
            model_name="produto",
            name="custo_atualizado_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Data da última atualização do custo de referência.",
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="servico",
            name="custo_referencia",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Custo de referência para compor o preço das propostas (custo × margem).",
                max_digits=12,
            ),
        ),
        migrations.AlterField(
            model_name="servico",
            name="custo_atualizado_em",
            field=models.DateTimeField(
                blank=True,
                help_text="Data da última atualização do custo de referência.",
                null=True,
            ),
        ),
    ]
