from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0006_especificacao_disjuntor_cm_rele_estado_solido"),
    ]

    operations = [
        migrations.RenameField(
            model_name="especificacaorelesobrecarga",
            old_name="faixa_nominal_min_a",
            new_name="faixa_ajuste_min_a",
        ),
        migrations.RenameField(
            model_name="especificacaorelesobrecarga",
            old_name="faixa_nominal_max_a",
            new_name="faixa_ajuste_max_a",
        ),
        migrations.AddField(
            model_name="especificacaorelesobrecarga",
            name="contatos_aux_na",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="especificacaorelesobrecarga",
            name="contatos_aux_nf",
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
