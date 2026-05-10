from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0003_produto_fornecedor"),
    ]

    operations = [
        migrations.AddField(
            model_name="produto",
            name="aliquota_ipi",
            field=models.DecimalField(
                blank=True,
                decimal_places=4,
                help_text="Alíquota de referência do IPI (%) para orçamento/lista; contexto fiscal da operação pode variar.",
                max_digits=7,
                null=True,
                verbose_name="Alíquota IPI (%)",
            ),
        ),
    ]
