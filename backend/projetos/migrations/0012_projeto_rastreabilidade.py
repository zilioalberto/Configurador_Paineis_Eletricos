from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projetos", "0011_remove_projetocodigomensal"),
    ]

    operations = [
        migrations.AddField(
            model_name="projeto",
            name="atualizado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="projetos_atualizados",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="projeto",
            name="criado_por",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="projetos_criados",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="ProjetoEvento",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("modulo", models.CharField(max_length=40)),
                ("acao", models.CharField(max_length=60)),
                ("descricao", models.CharField(max_length=255)),
                ("detalhes", models.JSONField(blank=True, default=dict)),
                (
                    "projeto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="eventos",
                        to="projetos.projeto",
                    ),
                ),
                (
                    "usuario",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="projeto_eventos",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Evento de projeto",
                "verbose_name_plural": "Eventos de projeto",
                "ordering": ["-criado_em"],
                "indexes": [
                    models.Index(fields=["projeto", "-criado_em"], name="projetos_pr_projeto_ce8875_idx"),
                    models.Index(fields=["modulo", "acao"], name="projetos_pr_modulo_54ed53_idx"),
                ],
            },
        ),
    ]
