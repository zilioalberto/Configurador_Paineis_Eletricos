# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dimensionamento", "0004_dimensionamentocircuitoalimentacaogeral"),
    ]

    operations = [
        migrations.AddField(
            model_name="resumodimensionamento",
            name="condutores_revisao_confirmada",
            field=models.BooleanField(
                default=False,
                help_text="Utilizador confirmou revisão/aprovação das bitolas de condutores no wizard.",
            ),
        ),
        migrations.AddField(
            model_name="dimensionamentocircuitocarga",
            name="secao_condutor_fase_escolhida_mm2",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Se preenchido, substitui a seção sugerida para fase (validação Iz ≥ corrente).",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="dimensionamentocircuitocarga",
            name="secao_condutor_neutro_escolhida_mm2",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
        migrations.AddField(
            model_name="dimensionamentocircuitocarga",
            name="secao_condutor_pe_escolhida_mm2",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
        migrations.AddField(
            model_name="dimensionamentocircuitoalimentacaogeral",
            name="secao_condutor_fase_escolhida_mm2",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
        migrations.AddField(
            model_name="dimensionamentocircuitoalimentacaogeral",
            name="secao_condutor_neutro_escolhida_mm2",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
        migrations.AddField(
            model_name="dimensionamentocircuitoalimentacaogeral",
            name="secao_condutor_pe_escolhida_mm2",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True
            ),
        ),
    ]
