from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0052_especificacao_plc_simplifica_familia"),
    ]

    operations = [
        migrations.AddField(
            model_name="especificacaoplc",
            name="tipo_entradas_analogicas",
            field=models.CharField(
                blank=True,
                choices=[
                    ("MA_0_20", "0–20 mA"),
                    ("MA_4_20", "4–20 mA"),
                    ("V_0_10", "0–10 V"),
                    ("V_PM_10", "±10 V"),
                    ("V_0_5", "0–5 V"),
                    ("CONFIGURAVEL_SOFTWARE", "Configurável via software"),
                ],
                help_text="Obrigatório quando há entradas analógicas; vazio quando não há.",
                max_length=30,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="especificacaoplc",
            name="tipo_saidas_analogicas",
            field=models.CharField(
                blank=True,
                choices=[
                    ("MA_0_20", "0–20 mA"),
                    ("MA_4_20", "4–20 mA"),
                    ("V_0_10", "0–10 V"),
                    ("V_PM_10", "±10 V"),
                    ("V_0_5", "0–5 V"),
                    ("CONFIGURAVEL_SOFTWARE", "Configurável via software"),
                ],
                help_text="Obrigatório quando há saídas analógicas; vazio quando não há.",
                max_length=30,
                null=True,
            ),
        ),
    ]
