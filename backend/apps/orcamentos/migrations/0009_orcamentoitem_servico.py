from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0006_catalogo_servico"),
        ("orcamentos", "0008_proposta_inicial_sem_revisao"),
    ]

    operations = [
        migrations.AddField(
            model_name="orcamentoitem",
            name="servico",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="orcamento_itens",
                to="catalogo.servico",
            ),
        ),
    ]
