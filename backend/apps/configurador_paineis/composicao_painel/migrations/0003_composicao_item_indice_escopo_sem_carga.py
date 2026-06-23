from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('composicao_painel', '0002_allow_borne_accessory_scopes'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='composicaoitem',
            name='uq_composicao_item_proj_parte_categoria_sem_carga',
        ),
        migrations.AddConstraint(
            model_name='composicaoitem',
            constraint=models.UniqueConstraint(condition=models.Q(('carga__isnull', True)), fields=('projeto', 'parte_painel', 'categoria_produto', 'indice_escopo'), name='uq_composicao_item_proj_parte_categoria_sem_carga'),
        ),
    ]
