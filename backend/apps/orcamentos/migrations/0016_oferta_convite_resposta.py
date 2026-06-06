# Convite público e resposta do cliente

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.orcamentos.models


class Migration(migrations.Migration):

    dependencies = [
        ("orcamentos", "0015_orcamento_investimento_descricao"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="orcamentoofertaarquivo",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("DOCX_REVISADO", "DOCX revisado"),
                    ("PDF_FINAL", "PDF final"),
                    ("PDF_ASSINADO_CLIENTE", "PDF assinado pelo cliente"),
                ],
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="OrcamentoOfertaConvite",
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
                ("token", models.CharField(db_index=True, max_length=64, unique=True)),
                ("valido_ate", models.DateField()),
                ("revogado_em", models.DateTimeField(blank=True, null=True)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                (
                    "criado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="orcamentos_oferta_convites",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "orcamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="oferta_convites",
                        to="orcamentos.orcamento",
                    ),
                ),
                (
                    "snapshot",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="convites",
                        to="orcamentos.orcamentosnapshot",
                    ),
                ),
            ],
            options={
                "db_table": "orcamento_oferta_convite",
                "ordering": ("-criado_em",),
            },
        ),
        migrations.CreateModel(
            name="OrcamentoOfertaRespostaCliente",
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
                    "decisao",
                    models.CharField(
                        choices=[
                            ("PENDENTE", "Pendente"),
                            ("APROVADO", "Aprovado"),
                            ("REJEITADO", "Rejeitado"),
                        ],
                        default="PENDENTE",
                        max_length=20,
                    ),
                ),
                ("nome_responsavel", models.CharField(blank=True, max_length=180)),
                ("cargo", models.CharField(blank=True, max_length=120)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("observacao", models.TextField(blank=True)),
                ("aceite_em", models.DateTimeField(blank=True, null=True)),
                ("ip", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True)),
                ("hash_snapshot", models.CharField(blank=True, max_length=64)),
                (
                    "assinatura_imagem",
                    models.FileField(
                        blank=True,
                        null=True,
                        upload_to=apps.orcamentos.models.oferta_arquivo_upload_to,
                    ),
                ),
            ],
            options={
                "db_table": "orcamento_oferta_resposta_cliente",
            },
        ),
        migrations.AddField(
            model_name="orcamentoofertarespostacliente",
            name="convite",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="resposta",
                to="orcamentos.orcamentoofertaconvite",
            ),
        ),
        migrations.AddField(
            model_name="orcamentoofertarespostacliente",
            name="pdf_assinado",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="respostas_cliente",
                to="orcamentos.orcamentoofertaarquivo",
            ),
        ),
        migrations.AddField(
            model_name="orcamentoofertaenvio",
            name="canal",
            field=models.CharField(
                choices=[
                    ("EMAIL", "E-mail"),
                    ("LINK", "Link copiado"),
                    ("MANUAL", "Registro manual"),
                ],
                default="MANUAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="orcamentoofertaenvio",
            name="email_enviado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="orcamentoofertaenvio",
            name="email_erro",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="orcamentoofertaenvio",
            name="link_publico",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="orcamentoofertaenvio",
            name="convite",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="envios",
                to="orcamentos.orcamentoofertaconvite",
            ),
        ),
    ]
