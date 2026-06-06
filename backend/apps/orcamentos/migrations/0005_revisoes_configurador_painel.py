# Generated manually for revisões e vínculo configurador

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def preencher_codigo_base_revisao(apps, schema_editor):
    Orcamento = apps.get_model("orcamentos", "Orcamento")
    for orc in Orcamento.objects.all().iterator():
        codigo = (orc.codigo or "").strip()
        if not orc.codigo_base:
            orc.codigo_base = codigo or f"LEG-{orc.id}"
        if not orc.revisao:
            orc.revisao = "A"
        if not orc.tipo_revisao:
            orc.tipo_revisao = "INICIAL"
        if codigo and " Rev " not in codigo and orc.codigo_base:
            orc.codigo = f"{orc.codigo_base} Rev {orc.revisao}"
        orc.save(update_fields=["codigo_base", "revisao", "tipo_revisao", "codigo"])


class Migration(migrations.Migration):

    dependencies = [
        ("projetos", "0003_rename_projeto_configurador"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("orcamentos", "0004_orcamento_criado_atualizado_por"),
    ]

    operations = [
        migrations.AlterField(
            model_name="orcamento",
            name="codigo",
            field=models.CharField(blank=True, db_index=True, max_length=48, unique=True),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="codigo_base",
            field=models.CharField(blank=True, db_index=True, max_length=32),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="revisao",
            field=models.CharField(default="A", max_length=4),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="tipo_revisao",
            field=models.CharField(
                choices=[
                    ("INICIAL", "Inicial"),
                    ("COMERCIAL", "Comercial"),
                    ("TECNICA", "Tecnica"),
                ],
                default="INICIAL",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="orcamento_origem",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="revisoes_derivadas",
                to="orcamentos.orcamento",
            ),
        ),
        migrations.CreateModel(
            name="OrcamentoConfiguradorPainel",
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
                ("ordem", models.PositiveIntegerField(default=0)),
                ("descricao_painel", models.CharField(max_length=200)),
                (
                    "modo",
                    models.CharField(
                        choices=[
                            ("ATIVO", "Ativo"),
                            ("HERANCA_HISTORICA", "Heranca historica"),
                        ],
                        default="ATIVO",
                        max_length=30,
                    ),
                ),
                ("sincronizado_em", models.DateTimeField(blank=True, null=True)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "configurador_painel_origem",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="derivados_revisao",
                        to="orcamentos.orcamentoconfiguradorpainel",
                    ),
                ),
                (
                    "orcamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="configuradores_painel",
                        to="orcamentos.orcamento",
                    ),
                ),
                (
                    "projeto_configurador",
                    models.ForeignKey(
                        blank=True,
                        db_column="projeto_configurador_id",
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="orcamentos_configurador_painel",
                        to="projetos.projetoconfigurador",
                    ),
                ),
                (
                    "projeto_configurador_origem",
                    models.ForeignKey(
                        blank=True,
                        db_column="projeto_configurador_origem_id",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="orcamentos_configurador_painel_derivados",
                        to="projetos.projetoconfigurador",
                    ),
                ),
            ],
            options={
                "db_table": "erp_orcamento_configurador_painel",
                "ordering": ("orcamento_id", "ordem", "id"),
            },
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="editavel",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="item_origem",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="derivados_revisao",
                to="orcamentos.orcamentoitem",
            ),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="configurador_painel",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="itens",
                to="orcamentos.orcamentoconfiguradorpainel",
            ),
        ),
        migrations.AlterField(
            model_name="orcamentoitem",
            name="origem",
            field=models.CharField(
                choices=[
                    ("MANUAL", "Manual"),
                    ("CONFIGURADOR", "Configurador de paineis"),
                    ("CATALOGO", "Catalogo de produtos"),
                    ("HERANCA_REVISAO", "Heranca de revisao anterior"),
                ],
                default="MANUAL",
                max_length=20,
            ),
        ),
        migrations.RunPython(preencher_codigo_base_revisao, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="orcamento",
            constraint=models.UniqueConstraint(
                fields=("codigo_base", "revisao"),
                name="uq_orcamento_codigo_base_revisao",
            ),
        ),
    ]
