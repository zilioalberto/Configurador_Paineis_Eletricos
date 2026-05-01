from django.db import migrations, models


def ajustar_temporizador(apps, schema_editor):
    Spec = apps.get_model("catalogo", "EspecificacaoTemporizador")
    valid_tensao = {24, 110, 220}
    for row in Spec.objects.iterator():
        updates = {}
        if row.tensao_alimentacao_v not in valid_tensao:
            updates["tensao_alimentacao_v"] = 24
        if getattr(row, "tipo_montagem", None) != "TRILHO_DIN":
            updates["tipo_montagem"] = "TRILHO_DIN"
        if updates:
            for k, v in updates.items():
                setattr(row, k, v)
            row.save(update_fields=list(updates.keys()))


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0048_especificacao_rele_interface_simplifica"),
    ]

    operations = [
        migrations.RunPython(ajustar_temporizador, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="multifuncao",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="possui_contato_reversivel",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="tempo_minimo",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="tempo_maximo",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="unidade_tempo",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="precisao_percentual",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="possui_led_indicacao",
        ),
        migrations.RemoveField(
            model_name="especificacaotemporizador",
            name="grau_protecao_ip",
        ),
        migrations.AlterField(
            model_name="especificacaotemporizador",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                choices=[(24, "24 V"), (110, "110 V"), (220, "220 V")],
                help_text="Tensão de alimentação (24, 110 ou 220 V).",
            ),
        ),
        migrations.AlterField(
            model_name="especificacaotemporizador",
            name="tipo_montagem",
            field=models.CharField(
                choices=[("TRILHO_DIN", "Trilho DIN")],
                default="TRILHO_DIN",
                max_length=30,
            ),
        ),
    ]
