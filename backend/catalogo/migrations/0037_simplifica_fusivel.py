from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0036_restringe_modo_montagem_rele_sobrecarga"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="especificacaofusivel",
            name="classe_utilizacao",
        ),
        migrations.RemoveField(
            model_name="especificacaofusivel",
            name="tensao_nominal_v",
        ),
        migrations.RemoveField(
            model_name="especificacaofusivel",
            name="capacidade_interrupcao_ka",
        ),
    ]
