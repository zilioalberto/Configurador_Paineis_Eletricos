from django.db import migrations, models


def _popular_tensao_ventilacao(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoReleEstadoSolido")
    Spec.objects.filter(possui_ventilacao=True, tensao_ventilacao_v__isnull=True).update(
        tensao_ventilacao_v=24
    )


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0039_simplifica_minidisjuntor_campos_finais"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoreleestadosolido",
            name="tensao_ventilacao_v",
            field=models.IntegerField(
                blank=True,
                choices=[(24, "24 VCC"), (220, "220 VCA")],
                null=True,
            ),
        ),
        migrations.RunPython(_popular_tensao_ventilacao, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaoreleestadosolido",
            name="tipo_carga",
        ),
    ]
