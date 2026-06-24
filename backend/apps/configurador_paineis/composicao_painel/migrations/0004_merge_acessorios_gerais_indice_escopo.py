from django.db import migrations


class Migration(migrations.Migration):
    """Reconcilia os dois leaf nodes 0003 do app (categoria_acessorios_gerais
    e composicao_item_indice_escopo_sem_carga) gerados em branches paralelas."""

    dependencies = [
        ('composicao_painel', '0003_categoria_acessorios_gerais'),
        ('composicao_painel', '0003_composicao_item_indice_escopo_sem_carga'),
    ]

    operations = []
