from django.db import migrations, models


def ajustar_controlador_temperatura(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoControladorTemperatura")
    valid_tensao = {24, 110, 220}
    for row in Spec.objects.iterator():
        if row.tensao_alimentacao_v not in valid_tensao:
            row.tensao_alimentacao_v = 24
            row.save(update_fields=["tensao_alimentacao_v"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0049_especificacao_temporizador_simplifica"),
    ]

    operations = [
        migrations.RunPython(ajustar_controlador_temperatura, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaocontroladortemperatura",
            name="tipo_corrente_alimentacao",
        ),
        migrations.RemoveField(
            model_name="especificacaocontroladortemperatura",
            name="faixa_temperatura_min_c",
        ),
        migrations.RemoveField(
            model_name="especificacaocontroladortemperatura",
            name="faixa_temperatura_max_c",
        ),
        migrations.RemoveField(
            model_name="especificacaocontroladortemperatura",
            name="protocolo_comunicacao",
        ),
        migrations.AlterField(
            model_name="especificacaocontroladortemperatura",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                choices=[(24, "24 V"), (110, "110 V"), (220, "220 V")],
                help_text="Tensão de alimentação (24, 110 ou 220 V).",
            ),
        ),
    ]
