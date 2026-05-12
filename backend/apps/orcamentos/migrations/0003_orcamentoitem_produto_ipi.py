import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0005_remove_produto_aliquota_ipi"),
        ("orcamentos", "0002_proposta_cliente_margens"),
    ]

    operations = [
        migrations.AlterField(
            model_name="orcamentoitem",
            name="origem",
            field=models.CharField(
                choices=[
                    ("MANUAL", "Manual"),
                    ("CONFIGURADOR", "Configurador de paineis"),
                    ("CATALOGO", "Catalogo de produtos"),
                ],
                default="MANUAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="aliquota_ipi",
            field=models.DecimalField(
                blank=True,
                decimal_places=4,
                help_text="Referencia do catalogo (primeiro item fiscal); pode ser ajustada na linha.",
                max_digits=7,
                null=True,
                verbose_name="Aliquota IPI (%)",
            ),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="produto",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="orcamento_itens",
                to="catalogo.produto",
            ),
        ),
    ]
