from django.db import migrations, models


def _forcar_trilho_din(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoMiniDisjuntor")
    Spec.objects.all().update(modo_montagem="TRILHO_DIN")


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0038_simplifica_rele_estado_solido"),
    ]

    operations = [
        migrations.RunPython(_forcar_trilho_din, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="especificacaominidisjuntor",
            name="modo_montagem",
            field=models.CharField(
                choices=[("TRILHO_DIN", "Trilho DIN")],
                default="TRILHO_DIN",
                max_length=20,
            ),
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="padrao",
        ),
        migrations.RemoveField(
            model_name="especificacaominidisjuntor",
            name="tensao_nominal_v",
        ),
    ]
