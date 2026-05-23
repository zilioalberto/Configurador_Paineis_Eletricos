from django.db import migrations, models

import core.choices


def preencher_strings_vazias(apps, schema_editor):
    for model_name, field_name in (
        ("CargaResistencia", "tipo_rele_interface"),
        ("CargaSensor", "tipo_sinal_analogico"),
        ("CargaTransdutor", "tipo_sinal_analogico"),
        ("CargaValvula", "tipo_rele_interface"),
    ):
        model = apps.get_model("cargas", model_name)
        model.objects.filter(**{f"{field_name}__isnull": True}).update(**{field_name: ""})


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("cargas", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(preencher_strings_vazias, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cargaresistencia",
            name="tipo_rele_interface",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoReleInterfaceValvulaChoices.choices,
                default="",
                help_text=(
                    "Quando o acionamento é relé de interface: eletromecânico ou estado sólido."
                ),
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="cargasensor",
            name="tipo_sinal_analogico",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoSinaisAnalogicosChoices.choices,
                default="",
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="cargatransdutor",
            name="tipo_sinal_analogico",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoSinaisAnalogicosChoices.choices,
                default="",
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="cargavalvula",
            name="tipo_rele_interface",
            field=models.CharField(
                blank=True,
                choices=core.choices.TipoReleInterfaceValvulaChoices.choices,
                default="",
                help_text=(
                    "Quando o acionamento é relé de interface: eletromecânico ou estado sólido."
                ),
                max_length=30,
            ),
        ),
    ]
