import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificacaoInterna",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("OFERTA_APROVADA_CLIENTE", "Oferta aprovada pelo cliente"),
                            ("OFERTA_REJEITADA_CLIENTE", "Oferta recusada pelo cliente"),
                        ],
                        max_length=40,
                    ),
                ),
                ("titulo", models.CharField(max_length=200)),
                ("mensagem", models.TextField(blank=True)),
                ("link", models.CharField(blank=True, max_length=500)),
                (
                    "referencia_app",
                    models.CharField(blank=True, db_index=True, max_length=40),
                ),
                (
                    "referencia_id",
                    models.UUIDField(blank=True, db_index=True, null=True),
                ),
                ("lida", models.BooleanField(db_index=True, default=False)),
                ("lida_em", models.DateTimeField(blank=True, null=True)),
                ("criado_em", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "destinatario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificacoes_internas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "notificacao_interna",
                "ordering": ("-criado_em",),
                "indexes": [
                    models.Index(
                        fields=["destinatario", "lida", "-criado_em"],
                        name="idx_notif_dest_lida_criado",
                    )
                ],
            },
        ),
    ]
