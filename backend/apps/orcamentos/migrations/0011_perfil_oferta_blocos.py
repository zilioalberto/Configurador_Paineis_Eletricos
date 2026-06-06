from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("orcamentos", "0010_status_finalizado"),
    ]

    operations = [
        migrations.AddField(
            model_name="orcamento",
            name="perfil_oferta",
            field=models.CharField(
                choices=[
                    ("MATERIAIS", "Materiais"),
                    ("SOLUCAO_COMPLETA", "Solucao completa"),
                ],
                default="MATERIAIS",
                max_length=30,
            ),
        ),
        migrations.CreateModel(
            name="OrcamentoOfertaBloco",
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
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("INTRODUCAO", "Introducao"),
                            ("ESCOPO", "Escopo de fornecimento"),
                            ("ITENS_FORNECIMENTO", "Itens considerados"),
                            ("SERVICOS", "Servicos considerados"),
                            ("EXCLUSOES", "Exclusoes"),
                            ("INVESTIMENTO", "Investimento"),
                            ("PRAZO_ENTREGA", "Prazo de entrega"),
                            ("CONDICOES_PAGAMENTO", "Condicoes de pagamento"),
                            ("CONDICOES_GERAIS", "Condicoes gerais"),
                            ("GARANTIA", "Garantia"),
                            ("APROVACAO", "Aprovacao"),
                            ("OBSERVACOES", "Observacoes"),
                        ],
                        default="OBSERVACOES",
                        max_length=40,
                    ),
                ),
                ("titulo", models.CharField(max_length=120)),
                ("conteudo", models.TextField(blank=True)),
                ("editavel", models.BooleanField(default=True)),
                (
                    "orcamento",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="oferta_blocos",
                        to="orcamentos.orcamento",
                    ),
                ),
            ],
            options={
                "db_table": "orcamento_oferta_bloco",
                "ordering": ("orcamento_id", "ordem", "id"),
            },
        ),
    ]
