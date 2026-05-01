from django.db import migrations, models


def normaliza_ihm_antes_restricao(apps, schema_editor):
    IHM = apps.get_model("catalogo", "EspecificacaoIHM")
    valid_t = {24, 110, 220}
    for row in IHM.objects.iterator():
        updates = {}
        if row.tensao_alimentacao_v not in valid_t:
            updates["tensao_alimentacao_v"] = 24
        if row.modo_montagem != "PORTA":
            updates["modo_montagem"] = "PORTA"
        if updates:
            IHM.objects.filter(pk=row.pk).update(**updates)


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0054_expansao_plc_familia_e_analogico"),
    ]

    operations = [
        migrations.RunPython(normaliza_ihm_antes_restricao, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaoihm",
            name="tipo_display",
        ),
        migrations.RemoveField(
            model_name="especificacaoihm",
            name="resolucao",
        ),
        migrations.RemoveField(
            model_name="especificacaoihm",
            name="tipo_corrente_alimentacao",
        ),
        migrations.AlterField(
            model_name="especificacaoihm",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                choices=[(24, "24 V"), (110, "110 V"), (220, "220 V")],
                default=24,
                help_text="Tensão de alimentação (24, 110 ou 220 V).",
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoihm",
            name="modo_montagem",
            field=models.CharField(
                choices=[("PORTA", "Porta")],
                default="PORTA",
                max_length=20,
            ),
        ),
    ]
