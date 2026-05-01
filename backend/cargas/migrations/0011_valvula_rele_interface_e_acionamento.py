from django.db import migrations, models


def _migrar_rele_estado_solido_valvula(apps, schema_editor):
    CargaValvula = apps.get_model("cargas", "CargaValvula")
    CargaValvula.objects.filter(tipo_acionamento="RELE_ESTADO_SOLIDO").update(
        tipo_acionamento="RELE_ACOPLADOR",
        tipo_rele_interface="ESTADO_SOLIDO",
    )
    CargaValvula.objects.filter(
        tipo_acionamento="RELE_ACOPLADOR", tipo_rele_interface__isnull=True
    ).update(tipo_rele_interface="ELETROMECANICA")


def _noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("cargas", "0010_alinha_campos_sensor_transdutor"),
    ]

    operations = [
        migrations.AddField(
            model_name="cargavalvula",
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
        migrations.RunPython(_migrar_rele_estado_solido_valvula, _noop_reverse),
        migrations.AlterField(
            model_name="cargavalvula",
            name="tipo_acionamento",
            field=models.CharField(
                choices=[
                    ("SOLENOIDE_DIRETO", "Solenoide direto"),
                    ("RELE_ACOPLADOR", "Relé de interface"),
                    ("CONTATOR", "Contator"),
                ],
                default="SOLENOIDE_DIRETO",
                help_text="Tipo de acionamento da válvula.",
                max_length=30,
            ),
        ),
    ]
