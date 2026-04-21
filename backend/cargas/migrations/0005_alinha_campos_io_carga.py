from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cargas", "0004_cargamodelo"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="carga",
            name="exige_fonte_auxiliar",
        ),
        migrations.RemoveField(
            model_name="carga",
            name="ocupa_entrada_analogica",
        ),
        migrations.RemoveField(
            model_name="carga",
            name="ocupa_entrada_digital",
        ),
        migrations.RemoveField(
            model_name="carga",
            name="ocupa_saida_analogica",
        ),
        migrations.RemoveField(
            model_name="carga",
            name="ocupa_saida_digital",
        ),
        migrations.AddField(
            model_name="carga",
            name="quantidade_entradas_analogicas",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="carga",
            name="quantidade_entradas_digitais",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="carga",
            name="quantidade_entradas_rapidas",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="carga",
            name="quantidade_saidas_analogicas",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="carga",
            name="quantidade_saidas_digitais",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
