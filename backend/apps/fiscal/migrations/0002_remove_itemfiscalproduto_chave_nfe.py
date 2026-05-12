from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("fiscal", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="itemfiscalproduto",
            name="chave_nfe",
        ),
    ]
