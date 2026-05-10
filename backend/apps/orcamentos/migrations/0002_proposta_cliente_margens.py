import re
import uuid
from decimal import Decimal

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


PADRAO_CODIGO_PROPOSTA = re.compile(r"^Prop-(\d{2})(\d{3})-(\d{2})$", re.IGNORECASE)


def inicializar_sequencias_propostas(apps, schema_editor):
    Orcamento = apps.get_model("orcamentos", "Orcamento")
    SequenciaPropostaMensal = apps.get_model("orcamentos", "SequenciaPropostaMensal")
    maiores_numeros = {}

    for codigo in Orcamento.objects.exclude(codigo="").values_list("codigo", flat=True):
        match = PADRAO_CODIGO_PROPOSTA.match(codigo or "")
        if not match:
            continue
        mes = int(match.group(1))
        numero = int(match.group(2))
        ano = 2000 + int(match.group(3))
        if not 1 <= mes <= 12:
            continue
        chave = (ano, mes)
        maiores_numeros[chave] = max(maiores_numeros.get(chave, 0), numero)

    for (ano, mes), ultimo_numero in maiores_numeros.items():
        SequenciaPropostaMensal.objects.update_or_create(
            ano=ano,
            mes=mes,
            defaults={"ultimo_numero": ultimo_numero},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("cadastros", "0002_parceiro_comercial"),
        ("orcamentos", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SequenciaPropostaMensal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ano", models.PositiveSmallIntegerField()),
                ("mes", models.PositiveSmallIntegerField()),
                ("ultimo_numero", models.PositiveIntegerField(default=0)),
            ],
            options={
                "db_table": "erp_orcamento_sequencia_mensal",
                "unique_together": {("ano", "mes")},
            },
        ),
        migrations.RunPython(inicializar_sequencias_propostas, migrations.RunPython.noop),
        migrations.CreateModel(
            name="ConfiguracaoMargemCliente",
            fields=[
                (
                    "id",
                    models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
                ),
                ("margem_produtos_percentual", models.DecimalField(decimal_places=2, default=0, max_digits=7, validators=[django.core.validators.MinValueValidator(Decimal("0"))])),
                ("margem_servicos_percentual", models.DecimalField(decimal_places=2, default=0, max_digits=7, validators=[django.core.validators.MinValueValidator(Decimal("0"))])),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "cliente",
                    models.OneToOneField(
                        limit_choices_to={"ativo": True, "eh_cliente": True},
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="configuracao_margem_orcamento",
                        to="cadastros.parceirocomercial",
                    ),
                ),
            ],
            options={
                "verbose_name": "Configuracao de margem por cliente",
                "verbose_name_plural": "Configuracoes de margem por cliente",
                "db_table": "erp_orcamento_margem_cliente",
                "ordering": ("cliente__razao_social",),
            },
        ),
        migrations.AlterField(
            model_name="orcamento",
            name="codigo",
            field=models.CharField(blank=True, db_index=True, max_length=32, unique=True),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="cliente",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"ativo": True, "eh_cliente": True},
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="orcamentos",
                to="cadastros.parceirocomercial",
            ),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="contato_cliente",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="orcamentos",
                to="cadastros.contatoparceiro",
            ),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="margem_produtos_percentual",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=7),
        ),
        migrations.AddField(
            model_name="orcamento",
            name="margem_servicos_percentual",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=7),
        ),
        migrations.AlterField(
            model_name="orcamento",
            name="cliente_referencia",
            field=models.CharField(blank=True, help_text="Texto desnormalizado para histórico e compatibilidade.", max_length=200),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="tipo",
            field=models.CharField(choices=[("PRODUTO", "Produto"), ("SERVICO", "Servico")], default="PRODUTO", max_length=20),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="origem",
            field=models.CharField(choices=[("MANUAL", "Manual"), ("CONFIGURADOR", "Configurador de paineis")], default="MANUAL", max_length=20),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="custo_unitario",
            field=models.DecimalField(decimal_places=4, default=0, max_digits=16),
        ),
        migrations.AddField(
            model_name="orcamentoitem",
            name="margem_percentual",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=7),
        ),
    ]
