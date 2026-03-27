from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("composicao_painel", "0002_sugestaoitem_carga"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="sugestaoitem",
            name="uq_sugestao_item_projeto_parte",
        ),
        migrations.AddConstraint(
            model_name="sugestaoitem",
            constraint=models.UniqueConstraint(
                condition=Q(carga__isnull=True),
                fields=("projeto", "parte_painel"),
                name="uq_sugestao_item_projeto_parte_sem_carga",
            ),
        ),
        migrations.AddConstraint(
            model_name="sugestaoitem",
            constraint=models.UniqueConstraint(
                condition=Q(carga__isnull=False),
                fields=("projeto", "parte_painel", "carga"),
                name="uq_sugestao_item_projeto_parte_carga",
            ),
        ),
    ]
