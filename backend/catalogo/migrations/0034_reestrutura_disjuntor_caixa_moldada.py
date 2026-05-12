from django.db import migrations, models

from core.choices.produtos import (
    ConfiguracaoDisparadorDisjuntorCMChoices,
    ModoMontagemChoices,
)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0033_produto_categoria_db_index"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="capacidade_interrupcao_220v_ka",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="capacidade_interrupcao_380v_ka",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="capacidade_interrupcao_440v_ka",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="configuracao_disparador",
            field=models.CharField(
                choices=ConfiguracaoDisparadorDisjuntorCMChoices.choices,
                default=ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_IR_II_FIXOS,
                max_length=64,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disparador_curto_ii_ajuste_max_a",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disparador_curto_ii_ajuste_min_a",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disparador_curto_ii_fixo_a",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disparador_sobrecarga_ir_ajuste_max_a",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disparador_sobrecarga_ir_ajuste_min_a",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AddField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disparador_sobrecarga_ir_fixo_a",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
        migrations.AlterField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="modo_montagem",
            field=models.CharField(
                choices=ModoMontagemChoices.choices,
                default=ModoMontagemChoices.PLACA,
                max_length=20,
            ),
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: _forward_popula_campos_novos(apps),
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="capacidade_interrupcao_ka",
        ),
        migrations.RemoveField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="corrente_ajuste_termico_max_a",
        ),
        migrations.RemoveField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="corrente_ajuste_termico_min_a",
        ),
        migrations.RemoveField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="disjuntor_fixo",
        ),
        migrations.RemoveField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="tensao_nominal_v",
        ),
        migrations.RemoveField(
            model_name="especificacaodisjuntorcaixamoldada",
            name="tipo_disparo",
        ),
    ]


def _forward_popula_campos_novos(apps):
    Model = apps.get_model("catalogo", "EspecificacaoDisjuntorCaixaMoldada")
    for row in Model.objects.all().iterator():
        row.capacidade_interrupcao_220v_ka = row.capacidade_interrupcao_ka
        row.capacidade_interrupcao_380v_ka = row.capacidade_interrupcao_ka
        row.capacidade_interrupcao_440v_ka = row.capacidade_interrupcao_ka
        row.modo_montagem = ModoMontagemChoices.PLACA
        if row.disjuntor_fixo:
            row.configuracao_disparador = (
                ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_IR_II_FIXOS
            )
            row.disparador_sobrecarga_ir_fixo_a = row.corrente_nominal_a
        else:
            row.configuracao_disparador = (
                ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO
            )
            row.disparador_sobrecarga_ir_ajuste_min_a = row.corrente_ajuste_termico_min_a
            row.disparador_sobrecarga_ir_ajuste_max_a = row.corrente_ajuste_termico_max_a
        row.disparador_curto_ii_fixo_a = None
        row.save(
            update_fields=[
                "capacidade_interrupcao_220v_ka",
                "capacidade_interrupcao_380v_ka",
                "capacidade_interrupcao_440v_ka",
                "modo_montagem",
                "configuracao_disparador",
                "disparador_sobrecarga_ir_fixo_a",
                "disparador_sobrecarga_ir_ajuste_min_a",
                "disparador_sobrecarga_ir_ajuste_max_a",
                "disparador_curto_ii_fixo_a",
            ]
        )
