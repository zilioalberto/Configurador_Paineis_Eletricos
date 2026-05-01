from django.db import migrations, models


def ajustar_rele_interface(apps, schema_editor):
    Rele = apps.get_model("catalogo", "EspecificacaoReleInterface")
    valid_tensao = {24, 110, 220}

    for row in Rele.objects.iterator():
        updates = {}
        if row.tensao_bobina_v not in valid_tensao:
            updates["tensao_bobina_v"] = 24
        q = row.quantidade_contatos
        if q is None or q < 1:
            updates["quantidade_contatos"] = 1
        elif q > 4:
            updates["quantidade_contatos"] = 4
        if updates:
            for k, v in updates.items():
                setattr(row, k, v)
            row.save(update_fields=list(updates.keys()))


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0047_especificacao_sinalizador_tensao_led"),
    ]

    operations = [
        migrations.RunPython(ajustar_rele_interface, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="corrente_bobina_a",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="tensao_contato_v",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="possui_protecao_sobretensao",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="tempo_acionamento_ms",
        ),
        migrations.RemoveField(
            model_name="especificacaoreleinterface",
            name="tempo_desligamento_ms",
        ),
        migrations.AlterField(
            model_name="especificacaoreleinterface",
            name="tensao_bobina_v",
            field=models.IntegerField(
                choices=[(24, "24 V"), (110, "110 V"), (220, "220 V")],
                help_text="Tensão da bobina (24, 110 ou 220 V).",
            ),
        ),
        migrations.AlterField(
            model_name="especificacaoreleinterface",
            name="quantidade_contatos",
            field=models.PositiveSmallIntegerField(
                choices=[(1, "1"), (2, "2"), (3, "3"), (4, "4")],
                default=1,
                help_text="Número de contatos disponíveis.",
            ),
        ),
    ]
