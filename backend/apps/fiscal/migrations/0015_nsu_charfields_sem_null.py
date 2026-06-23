from django.db import migrations, models

CAMPOS_NSU = [
    ("ControleNSU", "max_nsu"),
    ("ControleNsuNfseAdn", "max_nsu"),
    ("DocumentoSefazDistribuido", "nsu"),
    ("DocumentoNfseRecebido", "nsu_adn"),
]


def preencher_nsu_vazio(apps, schema_editor):
    """Converte NULL -> '' antes de tornar os campos NOT NULL."""
    for model_name, field in CAMPOS_NSU:
        modelo = apps.get_model("fiscal", model_name)
        modelo.objects.filter(**{f"{field}__isnull": True}).update(**{field: ""})


class Migration(migrations.Migration):
    dependencies = [
        ("fiscal", "0014_remover_origem_ponte_a3"),
    ]

    operations = [
        migrations.RunPython(preencher_nsu_vazio, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="controlensu",
            name="max_nsu",
            field=models.CharField(blank=True, max_length=15),
        ),
        migrations.AlterField(
            model_name="controlensunfseadn",
            name="max_nsu",
            field=models.CharField(blank=True, max_length=15),
        ),
        migrations.AlterField(
            model_name="documentosefazdistribuido",
            name="nsu",
            field=models.CharField(blank=True, db_index=True, max_length=15),
        ),
        migrations.AlterField(
            model_name="documentonfserecebido",
            name="nsu_adn",
            field=models.CharField(blank=True, max_length=15),
        ),
    ]
