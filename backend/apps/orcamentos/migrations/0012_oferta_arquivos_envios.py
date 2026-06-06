import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.orcamentos.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("orcamentos", "0011_perfil_oferta_blocos"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrcamentoOfertaArquivo",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("DOCX_REVISADO", "DOCX revisado"),
                            ("PDF_FINAL", "PDF final"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "arquivo",
                    models.FileField(upload_to=apps.orcamentos.models.oferta_arquivo_upload_to),
                ),
                ("nome_original", models.CharField(max_length=255)),
                ("content_type", models.CharField(blank=True, max_length=120)),
                ("tamanho_bytes", models.PositiveIntegerField(default=0)),
                ("versao", models.PositiveIntegerField(default=1)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                (
                    "criado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="orcamentos_oferta_arquivos",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "orcamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="oferta_arquivos",
                        to="orcamentos.orcamento",
                    ),
                ),
            ],
            options={
                "db_table": "orcamento_oferta_arquivo",
                "ordering": ("-criado_em",),
            },
        ),
        migrations.CreateModel(
            name="OrcamentoOfertaEnvio",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("destinatario_nome", models.CharField(blank=True, max_length=180)),
                ("destinatario_email", models.EmailField(blank=True, max_length=254)),
                ("assunto", models.CharField(blank=True, max_length=255)),
                ("mensagem", models.TextField(blank=True)),
                ("enviado_em", models.DateTimeField(auto_now_add=True)),
                (
                    "enviado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="orcamentos_oferta_envios",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "orcamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="oferta_envios",
                        to="orcamentos.orcamento",
                    ),
                ),
                (
                    "pdf_final",
                    models.ForeignKey(
                        limit_choices_to={"tipo": "PDF_FINAL"},
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="envios",
                        to="orcamentos.orcamentoofertaarquivo",
                    ),
                ),
            ],
            options={
                "db_table": "orcamento_oferta_envio",
                "ordering": ("-enviado_em",),
            },
        ),
    ]
