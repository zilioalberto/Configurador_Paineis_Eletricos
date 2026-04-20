from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("cargas", "0003_cargamotor_tipo_conexao_painel"),
    ]

    operations = [
        migrations.CreateModel(
            name="CargaModelo",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("nome", models.CharField(max_length=120, unique=True)),
                ("tipo", models.CharField(choices=[("MOTOR", "Motor"), ("VALVULA", "Válvula"), ("RESISTENCIA", "Resistência"), ("SENSOR", "Sensor"), ("TRANSDUTOR", "Transdutor"), ("TRANSMISSOR", "Transmissor"), ("OUTRO", "Outro")], max_length=30)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("ativo", models.BooleanField(default=True)),
                (
                    "atualizado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="carga_modelos_atualizados",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "criado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="carga_modelos_criados",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Modelo de carga",
                "verbose_name_plural": "Modelos de carga",
                "ordering": ["nome"],
                "indexes": [models.Index(fields=["ativo", "tipo"], name="cargas_carg_ativo_e5fce8_idx")],
            },
        ),
    ]
