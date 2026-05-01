from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0067_especificacao_painel_cor_nullable_inox"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="especificacaoclimatizacao",
            name="tipo_corrente_alimentacao",
        ),
        migrations.AlterField(
            model_name="especificacaoclimatizacao",
            name="tensao_alimentacao_v",
            field=models.IntegerField(
                choices=[
                    (24, "24V"),
                    (110, "110V"),
                    (220, "220V"),
                    (380, "380V"),
                ]
            ),
        ),
    ]
