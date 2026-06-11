from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0015_normalizar_cor_cabo_verde_amarelo"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="produto",
            name="fabricante",
        ),
    ]
