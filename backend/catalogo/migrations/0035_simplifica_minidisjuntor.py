from django.db import migrations, models

from core.choices.eletrica import TensaoChoices
from core.choices.produtos import ModoMontagemChoices


def _forcar_trilho_din(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoMiniDisjuntor")
    Spec.objects.all().update(modo_montagem=ModoMontagemChoices.TRILHO_DIN)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0034_reestrutura_disjuntor_caixa_moldada"),
    ]

    operations = [
        migrations.AlterField(
            model_name="especificacaominidisjuntor",
            name="modo_montagem",
            field=models.CharField(
                choices=ModoMontagemChoices.choices,
                default=ModoMontagemChoices.TRILHO_DIN,
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaominidisjuntor",
            name="tensao_nominal_v",
            field=models.IntegerField(
                choices=[
                    (TensaoChoices.V127, "127V"),
                    (TensaoChoices.V220, "220V"),
                    (TensaoChoices.V380, "380V"),
                ]
            ),
        ),
        migrations.RunPython(_forcar_trilho_din, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="capacidade_interrupcao_ka",
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="frequencia_hz",
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="tipo_corrente",
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="tipo_protecao",
        ),
    ]
