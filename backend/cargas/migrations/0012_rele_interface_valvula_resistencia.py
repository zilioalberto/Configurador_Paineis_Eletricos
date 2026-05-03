from django.db import migrations, models


def _renomeia_rele_acoplador_valvula(apps, schema_editor):
    CargaValvula = apps.get_model("cargas", "CargaValvula")
    CargaValvula.objects.filter(tipo_acionamento="RELE_ACOPLADOR").update(
        tipo_acionamento="RELE_INTERFACE"
    )


def _noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("cargas", "0011_valvula_rele_interface_e_acionamento"),
    ]

    operations = [
        migrations.RunPython(_renomeia_rele_acoplador_valvula, _noop),
        migrations.AlterField(
            model_name="cargavalvula",
            name="tipo_acionamento",
            field=models.CharField(
                choices=[
                    ("SOLENOIDE_DIRETO", "Solenoide direto"),
                    ("RELE_INTERFACE", "Relé de interface"),
                    ("CONTATOR", "Contator"),
                ],
                default="SOLENOIDE_DIRETO",
                help_text="Tipo de acionamento da válvula.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="cargaresistencia",
            name="tipo_rele_interface",
            field=models.CharField(
                blank=True,
                choices=[
                    ("ELETROMECANICA", "Eletromecânica"),
                    ("ESTADO_SOLIDO", "Estado sólido"),
                ],
                help_text="Quando o acionamento é relé de interface: eletromecânico ou estado sólido.",
                max_length=30,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="cargaresistencia",
            name="tipo_acionamento",
            field=models.CharField(
                choices=[
                    ("CONTATOR", "Contator"),
                    ("RELE_ESTADO_SOLIDO", "Relé de Estado Sólido"),
                    ("RELE_INTERFACE", "Relé de interface"),
                ],
                default="RELE_ESTADO_SOLIDO",
                help_text="Tipo de acionamento da resistência.",
                max_length=30,
            ),
        ),
    ]
