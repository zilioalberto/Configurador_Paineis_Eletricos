from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0045_especificacao_chave_seletora_restringe"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="especificacaochaveseletora",
            name="retorno_automatico",
        ),
    ]
