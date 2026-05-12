from decimal import Decimal

from django.db import migrations, models


def ajustar_dados_chave_seletora(apps, schema_editor):
    Chave = apps.get_model("catalogo", "EspecificacaoChaveSeletora")
    valid_tensao = {24, 110, 220}
    valid_diam = {Decimal("22"), Decimal("30")}
    valid_pos = {2, 3, 4}

    for row in Chave.objects.iterator():
        updates = {}
        if getattr(row, "tipo_acionamento", None) == "MANTIDO":
            updates["tipo_acionamento"] = "RETENTIVO"
        if row.numero_posicoes not in valid_pos:
            updates["numero_posicoes"] = 3
        if row.tensao_iluminacao_v is not None and row.tensao_iluminacao_v not in valid_tensao:
            updates["tensao_iluminacao_v"] = None
        if row.diametro_furo_mm is not None and row.diametro_furo_mm not in valid_diam:
            updates["diametro_furo_mm"] = Decimal("22")
        if row.modo_montagem != "PORTA":
            updates["modo_montagem"] = "PORTA"
        if updates:
            for k, v in updates.items():
                setattr(row, k, v)
            row.save(update_fields=list(updates.keys()))


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0044_especificacao_botao_iluminacao"),
    ]

    operations = [
        migrations.RunPython(ajustar_dados_chave_seletora, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="especificacaochaveseletora",
            name="angulo_comutacao_graus",
        ),
        migrations.RemoveField(
            model_name="especificacaochaveseletora",
            name="tipo_corrente_iluminacao",
        ),
        migrations.AlterField(
            model_name="especificacaochaveseletora",
            name="numero_posicoes",
            field=models.PositiveSmallIntegerField(
                choices=[(2, "2"), (3, "3"), (4, "4")],
                default=3,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaochaveseletora",
            name="tipo_acionamento",
            field=models.CharField(
                choices=[
                    ("RETENTIVO", "Retentivo"),
                    ("MOMENTANEO", "Momentâneo"),
                ],
                default="RETENTIVO",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaochaveseletora",
            name="diametro_furo_mm",
            field=models.DecimalField(
                choices=[(Decimal("22"), "22 mm"), (Decimal("30"), "30 mm")],
                decimal_places=2,
                default=Decimal("22"),
                max_digits=5,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaochaveseletora",
            name="tensao_iluminacao_v",
            field=models.IntegerField(
                blank=True,
                choices=[(24, "24 V"), (110, "110 V"), (220, "220 V")],
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaochaveseletora",
            name="grau_protecao_ip",
            field=models.CharField(
                blank=True,
                choices=[
                    ("IP55", "IP55"),
                    ("IP65", "IP65"),
                    ("IP66", "IP66"),
                    ("IP67", "IP67"),
                    ("IP69K", "IP69K"),
                ],
                max_length=10,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="especificacaochaveseletora",
            name="modo_montagem",
            field=models.CharField(
                choices=[("PORTA", "Porta")],
                default="PORTA",
                max_length=20,
            ),
        ),
    ]
