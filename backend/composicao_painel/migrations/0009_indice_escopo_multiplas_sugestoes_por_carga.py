# Generated manually for múltiplas contatoras (estrela-triângulo).

from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("composicao_painel", "0008_composicaoinclusaomanual"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="composicaoitem",
            name="uq_composicao_item_proj_parte_categoria_carga",
        ),
        migrations.RemoveConstraint(
            model_name="pendenciaitem",
            name="uq_pendencia_item_proj_parte_categoria_carga",
        ),
        migrations.RemoveConstraint(
            model_name="sugestaoitem",
            name="uq_sugestao_item_proj_parte_categoria_carga",
        ),
        migrations.AddField(
            model_name="composicaoitem",
            name="indice_escopo",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Índice para vários itens da mesma categoria por carga (ex.: K1/K2/K3).",
            ),
        ),
        migrations.AddField(
            model_name="pendenciaitem",
            name="indice_escopo",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Índice para múltiplas pendências do mesmo escopo (ex.: contatoras Y-Δ).",
            ),
        ),
        migrations.AddField(
            model_name="sugestaoitem",
            name="indice_escopo",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text=(
                    "Diferencia várias sugestões da mesma categoria para a mesma carga "
                    "(ex.: K1/K2/K3 em estrela-triângulo). Padrão 0."
                ),
            ),
        ),
        migrations.AddConstraint(
            model_name="composicaoitem",
            constraint=models.UniqueConstraint(
                condition=Q(carga__isnull=False),
                fields=(
                    "projeto",
                    "parte_painel",
                    "categoria_produto",
                    "carga",
                    "indice_escopo",
                ),
                name="uq_composicao_item_proj_parte_categoria_carga_escopo",
            ),
        ),
        migrations.AddConstraint(
            model_name="pendenciaitem",
            constraint=models.UniqueConstraint(
                condition=Q(carga__isnull=False),
                fields=(
                    "projeto",
                    "parte_painel",
                    "categoria_produto",
                    "carga",
                    "indice_escopo",
                ),
                name="uq_pendencia_item_proj_parte_categoria_carga_escopo",
            ),
        ),
        migrations.AddConstraint(
            model_name="sugestaoitem",
            constraint=models.UniqueConstraint(
                condition=Q(carga__isnull=False),
                fields=(
                    "projeto",
                    "parte_painel",
                    "categoria_produto",
                    "carga",
                    "indice_escopo",
                ),
                name="uq_sugestao_item_proj_parte_categoria_carga_escopo",
            ),
        ),
    ]
